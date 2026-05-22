#[cfg(debug_assertions)]
mod debug_impl {
    use std::{
        fs::{self, OpenOptions},
        io::Write,
        path::PathBuf,
        sync::{
            atomic::{AtomicBool, AtomicU64, Ordering},
            Mutex,
            OnceLock,
        },
        thread,
        time::{Duration, Instant},
    };

    use crate::logging;

    static STARTED: AtomicBool = AtomicBool::new(false);
    static START: OnceLock<Instant> = OnceLock::new();
    static FRONTEND_HEARTBEAT_MS: AtomicU64 = AtomicU64::new(0);
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
    }

    pub fn start() {
        if STARTED.swap(true, Ordering::Relaxed) {
            return;
        }

        let start = *START.get_or_init(Instant::now);
        thread::spawn(move || {
            let mut sequence = 0_u64;
            loop {
                sequence = sequence.saturating_add(1);
                write_heartbeat_line(sequence, start);
                thread::sleep(Duration::from_secs(2));
            }
        });
    }

    pub fn record_frontend_heartbeat(heartbeat: FrontendHeartbeat) {
        let start = *START.get_or_init(Instant::now);
        FRONTEND_HEARTBEAT_MS.store(elapsed_ms(start), Ordering::Relaxed);
        if let Ok(mut guard) = frontend_state().lock() {
            *guard = Some(heartbeat);
        }
    }

    pub fn record_window_event(event: impl Into<String>) {
        let runtime_ms = elapsed_ms(*START.get_or_init(Instant::now));
        if let Ok(mut guard) = native_state().lock() {
            guard.last_window_event = Some(event.into());
            guard.last_window_event_ms = runtime_ms;
        }
    }

    pub fn record_tray_event(event: impl Into<String>) {
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
        let frontend_details = frontend_details();
        let native_details = native_details(runtime_ms);
        let line = match frontend_age_ms {
            Some(age) => format!(
                "{timestamp} debug_heartbeat sequence={sequence} runtimeMs={runtime_ms} frontendAgeMs={age}{frontend_details}{native_details}\n"
            ),
            None => format!(
                "{timestamp} debug_heartbeat sequence={sequence} runtimeMs={runtime_ms} frontendAgeMs=none{frontend_details}{native_details}\n"
            ),
        };
        if let Err(error) = append_line(&line) {
            eprintln!("failed to write debug heartbeat: {error}");
        }
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
            " lastWindowEvent={} lastWindowEventAgeMs={} lastTrayEvent={} lastTrayEventAgeMs={}",
            guard
                .last_window_event
                .as_deref()
                .map(sanitize_log_value)
                .unwrap_or_else(|| "none".to_string()),
            age_or_none(runtime_ms, guard.last_window_event_ms, guard.last_window_event.is_some()),
            guard
                .last_tray_event
                .as_deref()
                .map(sanitize_log_value)
                .unwrap_or_else(|| "none".to_string()),
            age_or_none(runtime_ms, guard.last_tray_event_ms, guard.last_tray_event.is_some()),
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
        let path = heartbeat_log_path().unwrap_or_else(|| PathBuf::from("logs").join("kkterm-heartbeat.debug.log"));
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
}

#[cfg(debug_assertions)]
pub(crate) use debug_impl::{
    record_frontend_heartbeat, record_tray_event, record_window_event, start, FrontendHeartbeat,
};

#[cfg(not(debug_assertions))]
pub(crate) fn start() {}

#[cfg(not(debug_assertions))]
#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FrontendHeartbeat {
    pub document_has_focus: bool,
    pub visibility_state: String,
    pub raf_age_ms: Option<u64>,
    pub pointer_age_ms: Option<u64>,
    pub key_age_ms: Option<u64>,
    pub window_focus_age_ms: Option<u64>,
    pub window_blur_age_ms: Option<u64>,
}

#[cfg(not(debug_assertions))]
pub(crate) fn record_frontend_heartbeat(_: FrontendHeartbeat) {}

#[cfg(not(debug_assertions))]
pub(crate) fn record_window_event(_: impl Into<String>) {}

#[cfg(not(debug_assertions))]
pub(crate) fn record_tray_event(_: impl Into<String>) {}
