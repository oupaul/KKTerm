mod debug_impl {
    use std::{
        fs::{self, OpenOptions},
        io::Write,
        path::PathBuf,
        sync::{
            Mutex, OnceLock,
            atomic::{AtomicBool, AtomicU64, Ordering},
        },
        thread,
        time::{Duration, Instant},
    };

    use crate::logging;

    static STARTED: AtomicBool = AtomicBool::new(false);
    static START: OnceLock<Instant> = OnceLock::new();
    static FRONTEND_HEARTBEAT_MS: AtomicU64 = AtomicU64::new(0);
    static MAIN_THREAD_PONG_MS: AtomicU64 = AtomicU64::new(0);
    static FRONTEND_STATE: OnceLock<Mutex<Option<FrontendHeartbeat>>> = OnceLock::new();
    static NATIVE_STATE: OnceLock<Mutex<NativeDebugState>> = OnceLock::new();

    #[derive(Clone, serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct FrontendHeartbeat {
        pub document_has_focus: bool,
        pub visibility_state: String,
        pub raf_age_ms: Option<u64>,
        pub pointer_age_ms: Option<u64>,
        pub key_age_ms: Option<u64>,
        pub window_focus_age_ms: Option<u64>,
        pub window_blur_age_ms: Option<u64>,
    }

    #[derive(Default)]
    struct NativeDebugState {
        last_window_event: Option<String>,
        last_window_event_ms: u64,
        last_tray_event: Option<String>,
        last_tray_event_ms: u64,
        last_scale_factor: Option<f64>,
        last_scale_factor_ms: u64,
    }

    pub fn start(app: tauri::AppHandle) {
        if !heartbeat_enabled() {
            return;
        }
        if STARTED.swap(true, Ordering::Relaxed) {
            return;
        }

        let start = *START.get_or_init(Instant::now);
        // Seed the main-thread pong so the first lines read near zero instead of
        // looking like an immediate stall before the first probe lands.
        MAIN_THREAD_PONG_MS.store(elapsed_ms(start), Ordering::Relaxed);
        thread::spawn(move || {
            let mut sequence = 0_u64;
            loop {
                if !heartbeat_enabled() {
                    STARTED.store(false, Ordering::Relaxed);
                    break;
                }
                sequence = sequence.saturating_add(1);
                write_heartbeat_line(sequence, start);
                // Probe the native UI/event-loop thread. This closure only runs
                // when tao's main thread is pumping messages, so the recorded
                // pong ages out only when the main thread itself is blocked. If
                // the main thread keeps pumping while the frontend heartbeat
                // ages out, the freeze is inside the WebView2 renderer; if both
                // age out together, the native UI thread is blocked (e.g. a
                // native overlay / message-pump stall). That split is what
                // localizes the RDP-reconnect hang instead of guessing.
                let _ = app.run_on_main_thread(record_main_thread_pong);
                thread::sleep(Duration::from_secs(2));
            }
        });
    }

    pub fn record_frontend_heartbeat(heartbeat: FrontendHeartbeat) {
        if !heartbeat_enabled() {
            return;
        }
        let start = *START.get_or_init(Instant::now);
        FRONTEND_HEARTBEAT_MS.store(elapsed_ms(start), Ordering::Relaxed);
        if let Ok(mut guard) = frontend_state().lock() {
            *guard = Some(heartbeat);
        }
    }

    fn record_main_thread_pong() {
        let start = *START.get_or_init(Instant::now);
        MAIN_THREAD_PONG_MS.store(elapsed_ms(start), Ordering::Relaxed);
    }

    pub fn record_scale_factor(scale_factor: f64) {
        if !heartbeat_enabled() {
            return;
        }
        let runtime_ms = elapsed_ms(*START.get_or_init(Instant::now));
        if let Ok(mut guard) = native_state().lock() {
            guard.last_scale_factor = Some(scale_factor);
            guard.last_scale_factor_ms = runtime_ms;
        }
    }

    pub fn record_window_event(event: impl Into<String>) {
        if !heartbeat_enabled() {
            return;
        }
        let runtime_ms = elapsed_ms(*START.get_or_init(Instant::now));
        if let Ok(mut guard) = native_state().lock() {
            guard.last_window_event = Some(event.into());
            guard.last_window_event_ms = runtime_ms;
        }
    }

    pub fn record_tray_event(event: impl Into<String>) {
        if !heartbeat_enabled() {
            return;
        }
        let runtime_ms = elapsed_ms(*START.get_or_init(Instant::now));
        if let Ok(mut guard) = native_state().lock() {
            guard.last_tray_event = Some(event.into());
            guard.last_tray_event_ms = runtime_ms;
        }
    }

    fn write_heartbeat_line(sequence: u64, start: Instant) {
        let runtime_ms = elapsed_ms(start);
        let frontend_ms = FRONTEND_HEARTBEAT_MS.load(Ordering::Relaxed);
        let frontend_age_ms = if frontend_ms == 0 {
            None
        } else {
            Some(runtime_ms.saturating_sub(frontend_ms))
        };
        let timestamp = time::OffsetDateTime::now_utc()
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_else(|_| time::OffsetDateTime::now_utc().unix_timestamp().to_string());
        let runtime_details = runtime_details(runtime_ms);
        let frontend_details = frontend_details();
        let native_details = native_details(runtime_ms);
        let line = match frontend_age_ms {
            Some(age) => format!(
                "{timestamp} debug_heartbeat sequence={sequence} runtimeMs={runtime_ms} frontendAgeMs={age}{runtime_details}{frontend_details}{native_details}\n"
            ),
            None => format!(
                "{timestamp} debug_heartbeat sequence={sequence} runtimeMs={runtime_ms} frontendAgeMs=none{runtime_details}{frontend_details}{native_details}\n"
            ),
        };
        if let Err(error) = append_line(&line) {
            eprintln!("failed to write debug heartbeat: {error}");
        }
    }

    fn runtime_details(runtime_ms: u64) -> String {
        let pong_ms = MAIN_THREAD_PONG_MS.load(Ordering::Relaxed);
        let pong_age = if pong_ms == 0 {
            "none".to_string()
        } else {
            runtime_ms.saturating_sub(pong_ms).to_string()
        };
        let (gdi_objects, user_objects) = process_gui_resources();
        format!(
            " mainThreadPongAgeMs={} remoteSession={} gdiObjects={} userObjects={}",
            pong_age,
            remote_session(),
            option_u32(gdi_objects),
            option_u32(user_objects),
        )
    }

    fn frontend_details() -> String {
        let Some(state) = frontend_state().lock().ok().and_then(|guard| guard.clone()) else {
            return String::new();
        };

        format!(
            " documentHasFocus={} visibilityState={} rafAgeMs={} pointerAgeMs={} keyAgeMs={} windowFocusAgeMs={} windowBlurAgeMs={}",
            state.document_has_focus,
            sanitize_log_value(&state.visibility_state),
            option_ms(state.raf_age_ms),
            option_ms(state.pointer_age_ms),
            option_ms(state.key_age_ms),
            option_ms(state.window_focus_age_ms),
            option_ms(state.window_blur_age_ms),
        )
    }

    fn native_details(runtime_ms: u64) -> String {
        let Ok(guard) = native_state().lock() else {
            return String::new();
        };

        format!(
            " lastWindowEvent={} lastWindowEventAgeMs={} lastTrayEvent={} lastTrayEventAgeMs={} lastScaleFactor={} scaleFactorAgeMs={}",
            guard
                .last_window_event
                .as_deref()
                .map(sanitize_log_value)
                .unwrap_or_else(|| "none".to_string()),
            age_or_none(
                runtime_ms,
                guard.last_window_event_ms,
                guard.last_window_event.is_some()
            ),
            guard
                .last_tray_event
                .as_deref()
                .map(sanitize_log_value)
                .unwrap_or_else(|| "none".to_string()),
            age_or_none(
                runtime_ms,
                guard.last_tray_event_ms,
                guard.last_tray_event.is_some()
            ),
            guard
                .last_scale_factor
                .map(|value| format!("{value:.3}"))
                .unwrap_or_else(|| "none".to_string()),
            age_or_none(
                runtime_ms,
                guard.last_scale_factor_ms,
                guard.last_scale_factor.is_some()
            ),
        )
    }

    fn frontend_state() -> &'static Mutex<Option<FrontendHeartbeat>> {
        FRONTEND_STATE.get_or_init(|| Mutex::new(None))
    }

    fn native_state() -> &'static Mutex<NativeDebugState> {
        NATIVE_STATE.get_or_init(|| Mutex::new(NativeDebugState::default()))
    }

    fn option_ms(value: Option<u64>) -> String {
        value
            .map(|value| value.to_string())
            .unwrap_or_else(|| "none".to_string())
    }

    fn option_u32(value: Option<u32>) -> String {
        value
            .map(|value| value.to_string())
            .unwrap_or_else(|| "none".to_string())
    }

    /// True when KKTerm is running inside a remote (RDP) session. Logged each
    /// line so the connect/disconnect transition that precedes a hang is visible
    /// without registering for `WM_WTSSESSION_CHANGE`.
    fn remote_session() -> bool {
        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_REMOTESESSION};
            // SAFETY: GetSystemMetrics is a pure read of a Windows session metric.
            unsafe { GetSystemMetrics(SM_REMOTESESSION) != 0 }
        }
        #[cfg(not(target_os = "windows"))]
        {
            false
        }
    }

    /// This process's GDI and USER object counts. WebView2 has a documented GDI
    /// region-handle leak around RDP redraws; a count climbing toward the ~10k
    /// per-process ceiling alongside a hang points at handle exhaustion rather
    /// than a GPU/DPI cause. (Note: the WebView2 renderer runs out-of-process, so
    /// this measures KKTerm's own process only.)
    fn process_gui_resources() -> (Option<u32>, Option<u32>) {
        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::System::Threading::GetCurrentProcess;
            use windows_sys::Win32::UI::WindowsAndMessaging::{
                GR_GDIOBJECTS, GR_USEROBJECTS, GetGuiResources,
            };
            // SAFETY: GetCurrentProcess returns a pseudo-handle; GetGuiResources
            // only reads this process's GDI/USER object counts. A zero return
            // means the query failed, which we report as "none".
            unsafe {
                let process = GetCurrentProcess();
                let gdi = GetGuiResources(process, GR_GDIOBJECTS);
                let user = GetGuiResources(process, GR_USEROBJECTS);
                (
                    if gdi == 0 { None } else { Some(gdi) },
                    if user == 0 { None } else { Some(user) },
                )
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            (None, None)
        }
    }

    fn age_or_none(runtime_ms: u64, event_ms: u64, has_event: bool) -> String {
        if has_event {
            runtime_ms.saturating_sub(event_ms).to_string()
        } else {
            "none".to_string()
        }
    }

    fn sanitize_log_value(value: &str) -> String {
        value
            .chars()
            .map(|character| {
                if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | ':' | '.') {
                    character
                } else {
                    '_'
                }
            })
            .collect()
    }

    fn append_line(line: &str) -> std::io::Result<()> {
        let path = heartbeat_log_path()
            .unwrap_or_else(|| PathBuf::from("logs").join("kkterm-heartbeat.debug.log"));
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new().create(true).append(true).open(path)?;
        file.write_all(line.as_bytes())
    }

    fn heartbeat_log_path() -> Option<PathBuf> {
        Some(
            logging::log_path()?
                .parent()
                .unwrap_or_else(|| std::path::Path::new("."))
                .join("kkterm-heartbeat.debug.log"),
        )
    }

    fn elapsed_ms(start: Instant) -> u64 {
        u64::try_from(start.elapsed().as_millis()).unwrap_or(u64::MAX)
    }

    fn heartbeat_enabled() -> bool {
        heartbeat_enabled_for(
            cfg!(debug_assertions),
            logging::advanced_debugging_enabled(),
        )
    }

    fn heartbeat_enabled_for(debug_assertions: bool, advanced_debugging_enabled: bool) -> bool {
        debug_assertions || advanced_debugging_enabled
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn heartbeat_follows_debug_or_advanced_debugging_rule() {
            let expected = cfg!(debug_assertions) || logging::advanced_debugging_enabled();

            assert_eq!(heartbeat_enabled(), expected);
        }

        #[test]
        fn heartbeat_is_disabled_in_release_without_advanced_debugging() {
            assert!(!heartbeat_enabled_for(false, false));
            assert!(heartbeat_enabled_for(false, true));
            assert!(heartbeat_enabled_for(true, false));
            assert!(heartbeat_enabled_for(true, true));
        }
    }
}

pub(crate) use debug_impl::{
    FrontendHeartbeat, record_frontend_heartbeat, record_scale_factor, record_tray_event,
    record_window_event, start,
};
