use std::sync::{Mutex, mpsc};
use std::thread::{self, JoinHandle};
use std::time::Duration;

pub struct DontSleepManager {
    state: Mutex<DontSleepState>,
}

struct DontSleepState {
    desired_enabled: bool,
    foreground_only: bool,
    app_foreground: bool,
    worker: Option<DontSleepWorker>,
}

impl DontSleepManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(DontSleepState {
                desired_enabled: false,
                foreground_only: true,
                app_foreground: true,
                worker: None,
            }),
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.state
            .lock()
            .map(|state| state.desired_enabled)
            .unwrap_or(false)
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<bool, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Don't Sleep state is unavailable".to_string())?;
        state.desired_enabled = enabled;
        apply_effective_state(&mut state)?;
        Ok(state.desired_enabled)
    }

    pub fn set_foreground_only(&self, foreground_only: bool) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Don't Sleep state is unavailable".to_string())?;
        state.foreground_only = foreground_only;
        apply_effective_state(&mut state)
    }

    pub fn set_app_foreground(&self, app_foreground: bool) -> Result<(), String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Don't Sleep state is unavailable".to_string())?;
        state.app_foreground = app_foreground;
        apply_effective_state(&mut state)
    }
}

fn apply_effective_state(state: &mut DontSleepState) -> Result<(), String> {
    let should_assert = state.desired_enabled && (!state.foreground_only || state.app_foreground);
    if should_assert {
        if state.worker.is_none() {
            state.worker = Some(DontSleepWorker::start()?);
        }
        return Ok(());
    }

    if let Some(active_worker) = state.worker.take() {
        active_worker.stop()?;
    }
    Ok(())
}

struct DontSleepWorker {
    stop_tx: mpsc::Sender<()>,
    handle: JoinHandle<Result<(), String>>,
}

impl DontSleepWorker {
    fn start() -> Result<Self, String> {
        let (ready_tx, ready_rx) = mpsc::channel();
        let (stop_tx, stop_rx) = mpsc::channel();
        let handle = thread::Builder::new()
            .name("KKTerm Don't Sleep".to_string())
            .spawn(move || platform::run_dont_sleep_worker(stop_rx, ready_tx))
            .map_err(|error| format!("failed to start Don't Sleep worker: {error}"))?;

        match ready_rx.recv_timeout(Duration::from_secs(3)) {
            Ok(Ok(())) => Ok(Self { stop_tx, handle }),
            Ok(Err(error)) => {
                let _ = handle.join();
                Err(error)
            }
            Err(error) => {
                let _ = stop_tx.send(());
                let _ = handle.join();
                Err(format!("Don't Sleep worker did not start: {error}"))
            }
        }
    }

    fn stop(self) -> Result<(), String> {
        let _ = self.stop_tx.send(());
        self.handle
            .join()
            .map_err(|_| "Don't Sleep worker panicked".to_string())?
    }
}

#[cfg(target_os = "windows")]
mod platform {
    use std::{mem, ptr, sync::mpsc, time::Duration};

    use windows_sys::Win32::{
        Foundation::{GetLastError, HINSTANCE, HWND, LPARAM, LRESULT, WPARAM},
        System::{
            LibraryLoader::GetModuleHandleW,
            Power::{
                ES_AWAYMODE_REQUIRED, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
                SetThreadExecutionState,
            },
            Shutdown::{ShutdownBlockReasonCreate, ShutdownBlockReasonDestroy},
        },
        UI::WindowsAndMessaging::{
            CW_USEDEFAULT, CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, MSG,
            PM_REMOVE, PeekMessageW, RegisterClassW, TranslateMessage, UnregisterClassW,
            WM_ENDSESSION, WM_QUERYENDSESSION, WNDCLASSW, WS_OVERLAPPED,
        },
    };

    const WINDOW_CLASS: &str = "KKTermDontSleepWindow";
    const WINDOW_TITLE: &str = "KKTerm Don't Sleep";
    const SHUTDOWN_REASON: &str = "KKTerm Don't Sleep mode is enabled.";

    pub fn run_dont_sleep_worker(
        stop_rx: mpsc::Receiver<()>,
        ready_tx: mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        let mut guard = match DontSleepGuard::new() {
            Ok(guard) => {
                let _ = ready_tx.send(Ok(()));
                guard
            }
            Err(error) => {
                let _ = ready_tx.send(Err(error.clone()));
                return Err(error);
            }
        };

        loop {
            guard.pump_messages();
            match stop_rx.recv_timeout(Duration::from_millis(100)) {
                Ok(()) | Err(mpsc::RecvTimeoutError::Disconnected) => break,
                Err(mpsc::RecvTimeoutError::Timeout) => {}
            }
        }

        Ok(())
    }

    struct DontSleepGuard {
        class_name: Vec<u16>,
        hwnd: HWND,
        instance: HINSTANCE,
        shutdown_block_reason_registered: bool,
        window_destroyed: bool,
    }

    impl DontSleepGuard {
        fn new() -> Result<Self, String> {
            let class_name = wide_string(WINDOW_CLASS);
            let window_title = wide_string(WINDOW_TITLE);
            let shutdown_reason = wide_string(SHUTDOWN_REASON);

            unsafe {
                let instance = GetModuleHandleW(ptr::null());
                if instance.is_null() {
                    return Err(format!(
                        "failed to resolve module handle: Windows error {}",
                        GetLastError()
                    ));
                }

                let window_class = WNDCLASSW {
                    lpfnWndProc: Some(dont_sleep_window_proc),
                    hInstance: instance,
                    lpszClassName: class_name.as_ptr(),
                    ..mem::zeroed()
                };

                if RegisterClassW(&window_class) == 0 {
                    return Err(format!(
                        "failed to register Don't Sleep window class: Windows error {}",
                        GetLastError()
                    ));
                }

                let hwnd = CreateWindowExW(
                    0,
                    class_name.as_ptr(),
                    window_title.as_ptr(),
                    WS_OVERLAPPED,
                    CW_USEDEFAULT,
                    CW_USEDEFAULT,
                    0,
                    0,
                    ptr::null_mut(),
                    ptr::null_mut(),
                    instance,
                    ptr::null(),
                );

                if hwnd.is_null() {
                    let _ = UnregisterClassW(class_name.as_ptr(), instance);
                    return Err(format!(
                        "failed to create Don't Sleep shutdown window: Windows error {}",
                        GetLastError()
                    ));
                }

                if ShutdownBlockReasonCreate(hwnd, shutdown_reason.as_ptr()) == 0 {
                    let _ = DestroyWindow(hwnd);
                    let _ = UnregisterClassW(class_name.as_ptr(), instance);
                    return Err(format!(
                        "failed to register Don't Sleep shutdown block reason: Windows error {}",
                        GetLastError()
                    ));
                }

                let full_flags =
                    ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED | ES_AWAYMODE_REQUIRED;
                let base_flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED;
                if SetThreadExecutionState(full_flags) == 0
                    && SetThreadExecutionState(base_flags) == 0
                {
                    let _ = ShutdownBlockReasonDestroy(hwnd);
                    let _ = DestroyWindow(hwnd);
                    let _ = UnregisterClassW(class_name.as_ptr(), instance);
                    return Err(format!(
                        "failed to enable Windows execution state: Windows error {}",
                        GetLastError()
                    ));
                }

                Ok(Self {
                    class_name,
                    hwnd,
                    instance,
                    shutdown_block_reason_registered: true,
                    window_destroyed: false,
                })
            }
        }

        fn pump_messages(&mut self) {
            unsafe {
                let mut message: MSG = mem::zeroed();
                while PeekMessageW(&mut message, self.hwnd, 0, 0, PM_REMOVE) != 0 {
                    let _ = TranslateMessage(&message);
                    let _ = DispatchMessageW(&message);
                }
            }
        }

        fn teardown(&mut self) {
            unsafe {
                let _ = SetThreadExecutionState(ES_CONTINUOUS);
                if self.shutdown_block_reason_registered {
                    let _ = ShutdownBlockReasonDestroy(self.hwnd);
                    self.shutdown_block_reason_registered = false;
                }
                if !self.window_destroyed {
                    let _ = DestroyWindow(self.hwnd);
                    self.window_destroyed = true;
                }
                let _ = UnregisterClassW(self.class_name.as_ptr(), self.instance);
            }
        }
    }

    impl Drop for DontSleepGuard {
        fn drop(&mut self) {
            self.teardown();
        }
    }

    unsafe extern "system" fn dont_sleep_window_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        match message {
            WM_QUERYENDSESSION => 0,
            WM_ENDSESSION => 0,
            _ => unsafe { DefWindowProcW(hwnd, message, wparam, lparam) },
        }
    }

    fn wide_string(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use std::os::raw::{c_char, c_void};
    use std::sync::mpsc;

    use core_foundation_sys::base::CFRelease;
    use core_foundation_sys::string::{
        CFStringCreateWithCString, CFStringRef, kCFStringEncodingUTF8,
    };

    type IOPMAssertionID = u32;
    type IOPMAssertionLevel = u32;
    type IOReturn = i32;

    const K_IOPM_ASSERTION_LEVEL_ON: IOPMAssertionLevel = 255;
    const K_IO_RETURN_SUCCESS: IOReturn = 0;
    // kIOPMAssertionTypePreventUserIdleDisplaySleep: keeps the display on and,
    // by implication, prevents idle system sleep — matching the Windows
    // ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED behavior.
    const ASSERTION_TYPE: &[u8] = b"PreventUserIdleDisplaySleep\0";
    const ASSERTION_NAME: &[u8] = b"KKTerm Don't Sleep\0";

    #[link(name = "IOKit", kind = "framework")]
    unsafe extern "C" {
        fn IOPMAssertionCreateWithName(
            assertion_type: CFStringRef,
            assertion_level: IOPMAssertionLevel,
            assertion_name: CFStringRef,
            assertion_id: *mut IOPMAssertionID,
        ) -> IOReturn;
        fn IOPMAssertionRelease(assertion_id: IOPMAssertionID) -> IOReturn;
    }

    unsafe fn cfstring(bytes: &[u8]) -> CFStringRef {
        unsafe {
            CFStringCreateWithCString(
                std::ptr::null(),
                bytes.as_ptr() as *const c_char,
                kCFStringEncodingUTF8,
            )
        }
    }

    struct AssertionGuard {
        id: IOPMAssertionID,
    }

    impl Drop for AssertionGuard {
        fn drop(&mut self) {
            unsafe {
                IOPMAssertionRelease(self.id);
            }
        }
    }

    pub fn run_dont_sleep_worker(
        stop_rx: mpsc::Receiver<()>,
        ready_tx: mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        let guard = unsafe {
            let type_str = cfstring(ASSERTION_TYPE);
            let name_str = cfstring(ASSERTION_NAME);
            if type_str.is_null() || name_str.is_null() {
                if !type_str.is_null() {
                    CFRelease(type_str as *const c_void);
                }
                if !name_str.is_null() {
                    CFRelease(name_str as *const c_void);
                }
                let error = "failed to allocate Don't Sleep assertion strings".to_string();
                let _ = ready_tx.send(Err(error.clone()));
                return Err(error);
            }

            let mut id: IOPMAssertionID = 0;
            let result =
                IOPMAssertionCreateWithName(type_str, K_IOPM_ASSERTION_LEVEL_ON, name_str, &mut id);
            CFRelease(type_str as *const c_void);
            CFRelease(name_str as *const c_void);

            if result != K_IO_RETURN_SUCCESS {
                let error =
                    format!("failed to create Don't Sleep power assertion: IOReturn {result}");
                let _ = ready_tx.send(Err(error.clone()));
                return Err(error);
            }

            AssertionGuard { id }
        };

        let _ = ready_tx.send(Ok(()));

        // Hold the assertion until the manager asks the worker to stop. Unlike
        // the Windows path there is no message pump to service.
        loop {
            match stop_rx.recv() {
                Ok(()) | Err(mpsc::RecvError) => break,
            }
        }

        drop(guard);
        Ok(())
    }
}

// Hold a D-Bus idle/suspend inhibitor while Don't Sleep is enabled. Primary:
// the xdg-desktop-portal Inhibit portal (org.freedesktop.portal.Inhibit),
// which is desktop-agnostic — GNOME and KDE both back it, it works from
// sandboxes, and its idle flag keeps the display awake, matching the Windows
// ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED behavior. Fallback for desktops
// without a portal: the legacy org.freedesktop.ScreenSaver interface.
#[cfg(target_os = "linux")]
mod platform {
    use std::collections::HashMap;
    use std::sync::mpsc;

    use zbus::blocking::Connection;
    use zbus::zvariant::{OwnedObjectPath, Value};

    const INHIBIT_REASON: &str = "KKTerm Don't Sleep mode is enabled.";
    const PORTAL_DESTINATION: &str = "org.freedesktop.portal.Desktop";
    // org.freedesktop.portal.Inhibit flags: 4 = suspend, 8 = idle.
    const PORTAL_INHIBIT_SUSPEND_AND_IDLE: u32 = 4 | 8;
    const SCREENSAVER_DESTINATION: &str = "org.freedesktop.ScreenSaver";
    const SCREENSAVER_PATH: &str = "/org/freedesktop/ScreenSaver";

    enum InhibitHold {
        Portal { request_path: OwnedObjectPath },
        ScreenSaver { cookie: u32 },
    }

    struct DontSleepGuard {
        connection: Connection,
        hold: InhibitHold,
    }

    impl DontSleepGuard {
        fn acquire() -> Result<Self, String> {
            let connection = Connection::session()
                .map_err(|error| format!("failed to connect to the session D-Bus: {error}"))?;
            let portal_error = match portal_inhibit(&connection) {
                Ok(request_path) => {
                    return Ok(Self {
                        connection,
                        hold: InhibitHold::Portal { request_path },
                    });
                }
                Err(error) => error,
            };
            match screensaver_inhibit(&connection) {
                Ok(cookie) => Ok(Self {
                    connection,
                    hold: InhibitHold::ScreenSaver { cookie },
                }),
                Err(fallback_error) => Err(format!(
                    "failed to acquire a sleep inhibitor (portal: {portal_error}; screensaver: {fallback_error})"
                )),
            }
        }
    }

    impl Drop for DontSleepGuard {
        fn drop(&mut self) {
            match &self.hold {
                InhibitHold::Portal { request_path } => {
                    let _ = self.connection.call_method(
                        Some(PORTAL_DESTINATION),
                        request_path.as_ref(),
                        Some("org.freedesktop.portal.Request"),
                        "Close",
                        &(),
                    );
                }
                InhibitHold::ScreenSaver { cookie } => {
                    let _ = self.connection.call_method(
                        Some(SCREENSAVER_DESTINATION),
                        SCREENSAVER_PATH,
                        Some(SCREENSAVER_DESTINATION),
                        "UnInhibit",
                        &(*cookie,),
                    );
                }
            }
        }
    }

    fn portal_inhibit(connection: &Connection) -> Result<OwnedObjectPath, String> {
        let mut options: HashMap<&str, Value> = HashMap::new();
        options.insert("reason", Value::from(INHIBIT_REASON));
        let reply = connection
            .call_method(
                Some(PORTAL_DESTINATION),
                "/org/freedesktop/portal/desktop",
                Some("org.freedesktop.portal.Inhibit"),
                "Inhibit",
                &("", PORTAL_INHIBIT_SUSPEND_AND_IDLE, options),
            )
            .map_err(|error| error.to_string())?;
        reply
            .body()
            .deserialize::<OwnedObjectPath>()
            .map_err(|error| error.to_string())
    }

    fn screensaver_inhibit(connection: &Connection) -> Result<u32, String> {
        let reply = connection
            .call_method(
                Some(SCREENSAVER_DESTINATION),
                SCREENSAVER_PATH,
                Some(SCREENSAVER_DESTINATION),
                "Inhibit",
                &("KKTerm", INHIBIT_REASON),
            )
            .map_err(|error| error.to_string())?;
        reply
            .body()
            .deserialize::<u32>()
            .map_err(|error| error.to_string())
    }

    pub fn run_dont_sleep_worker(
        stop_rx: mpsc::Receiver<()>,
        ready_tx: mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        let guard = match DontSleepGuard::acquire() {
            Ok(guard) => {
                let _ = ready_tx.send(Ok(()));
                guard
            }
            Err(error) => {
                let _ = ready_tx.send(Err(error.clone()));
                return Err(error);
            }
        };

        // Hold the inhibitor until the manager asks the worker to stop; the
        // guard releases it on drop.
        loop {
            match stop_rx.recv() {
                Ok(()) | Err(mpsc::RecvError) => break,
            }
        }

        drop(guard);
        Ok(())
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
mod platform {
    use std::sync::mpsc;

    pub fn run_dont_sleep_worker(
        _stop_rx: mpsc::Receiver<()>,
        ready_tx: mpsc::Sender<Result<(), String>>,
    ) -> Result<(), String> {
        let error = "Don't Sleep is not available on this platform.".to_string();
        let _ = ready_tx.send(Err(error.clone()));
        Err(error)
    }
}

#[cfg(test)]
mod tests {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_set_enabled_acquires_and_releases_assertion() {
        let manager = DontSleepManager::new();

        assert!(manager.set_enabled(true).expect("enable should succeed"));
        assert!(manager.is_enabled());

        manager.set_enabled(false).expect("disable should succeed");
        assert!(!manager.is_enabled());
    }

    // Needs a live session D-Bus with xdg-desktop-portal (or a ScreenSaver
    // service), so it is ignored by default; run manually on a desktop with
    // `cargo test -- --ignored linux_set_enabled`.
    #[cfg(target_os = "linux")]
    #[test]
    #[ignore = "requires a desktop session D-Bus"]
    fn linux_set_enabled_acquires_and_releases_inhibitor() {
        let manager = DontSleepManager::new();

        assert!(manager.set_enabled(true).expect("enable should succeed"));
        assert!(manager.is_enabled());

        manager.set_enabled(false).expect("disable should succeed");
        assert!(!manager.is_enabled());
    }
}
