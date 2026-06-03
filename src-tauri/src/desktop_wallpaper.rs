use std::sync::Once;

pub(crate) const WALLPAPER_PICKER_EVENT: &str = "kkterm://desktop-wallpaper-pick";
pub(crate) const WALLPAPER_SETTINGS_EVENT: &str = "kkterm://desktop-wallpaper-settings";
pub(crate) const WALLPAPER_PAUSED_EVENT: &str = "kkterm://desktop-wallpaper-paused";

static PAUSE_MONITOR: Once = Once::new();

#[cfg(target_os = "windows")]
mod platform {
    use std::{mem, thread, time::Duration};

    use tauri::{Emitter, Manager, Runtime, WebviewWindowBuilder};
    use windows::{
        Win32::{
            Foundation::{HWND, LPARAM, POINT, RECT, WPARAM},
            Graphics::Gdi::{
                GetMonitorInfoW, MapWindowPoints, MonitorFromWindow, MONITORINFO,
                MONITOR_DEFAULTTONEAREST,
            },
            UI::WindowsAndMessaging::{
                EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetForegroundWindow,
                GetSystemMetrics, GetWindowRect, IsZoomed, SendMessageTimeoutW, SetParent,
                SetWindowPos, ShowWindow, SMTO_NORMAL, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
                SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SWP_NOACTIVATE, SWP_NOZORDER,
                SW_SHOWNOACTIVATE,
            },
        },
        core::{w, BOOL, PCWSTR},
    };

    use super::{WALLPAPER_PAUSED_EVENT, WALLPAPER_SETTINGS_EVENT};

    const WALLPAPER_WINDOW_LABEL: &str = "kkterm-wallpaper";
    const WALLPAPER_ROUTE: &str = "index.html#/wallpaper";
    const WALLPAPER_OVERSCAN_PX: i32 = 4;
    const PAUSE_POLL_INTERVAL: Duration = Duration::from_millis(1000);

    struct WorkerSearch {
        workerw: HWND,
    }

    pub fn set<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
        clear(app)?;

        let bounds = expanded_virtual_screen_bounds();
        let window = WebviewWindowBuilder::new(
            app,
            WALLPAPER_WINDOW_LABEL,
            tauri::WebviewUrl::App(WALLPAPER_ROUTE.into()),
        )
        .title("KKTerm Wallpaper")
        .position(bounds.left as f64, bounds.top as f64)
        .inner_size(
            (bounds.right - bounds.left).max(1) as f64,
            (bounds.bottom - bounds.top).max(1) as f64,
        )
        .decorations(false)
        .resizable(false)
        .visible(false)
        .skip_taskbar(true)
        .disable_drag_drop_handler()
        .build()
        .map_err(|error| format!("failed to create wallpaper window: {error}"))?;

        let handle = window
            .hwnd()
            .map_err(|error| format!("failed to read wallpaper window handle: {error}"))?;
        let hwnd = HWND(handle.0);
        attach_wallpaper_window(hwnd, bounds)?;
        let _ = window.show();
        let _ = app.emit(WALLPAPER_SETTINGS_EVENT, ());
        Ok(())
    }

    pub fn clear<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(WALLPAPER_WINDOW_LABEL) {
            window
                .destroy()
                .map_err(|error| format!("failed to destroy wallpaper window: {error}"))?;
        }
        let _ = app.emit(WALLPAPER_PAUSED_EVENT, false);
        let _ = app.emit(WALLPAPER_SETTINGS_EVENT, ());
        Ok(())
    }

    pub fn start_pause_monitor<R: Runtime>(app: tauri::AppHandle<R>) {
        thread::spawn(move || {
            let mut last_paused = false;
            loop {
                thread::sleep(PAUSE_POLL_INTERVAL);
                let paused = should_pause_wallpaper(&app);
                if paused != last_paused {
                    last_paused = paused;
                    let _ = app.emit(WALLPAPER_PAUSED_EVENT, paused);
                }
            }
        });
    }

    fn attach_wallpaper_window(hwnd: HWND, bounds: RECT) -> Result<(), String> {
        let workerw = find_wallpaper_workerw()?;
        unsafe {
            SetWindowPos(
                hwnd,
                None,
                bounds.left,
                bounds.top,
                rect_width(bounds),
                rect_height(bounds),
                SWP_NOACTIVATE,
            )
            .map_err(|error| format!("failed to position wallpaper window: {error}"))?;

            SetParent(hwnd, Some(workerw))
                .map_err(|error| format!("failed to attach wallpaper window to WorkerW: {error}"))?;

            let mut points = [
                POINT {
                    x: bounds.left,
                    y: bounds.top,
                },
                POINT {
                    x: bounds.right,
                    y: bounds.bottom,
                },
            ];
            let _ = MapWindowPoints(None, Some(workerw), &mut points);
            SetWindowPos(
                hwnd,
                None,
                points[0].x,
                points[0].y,
                (points[1].x - points[0].x).max(1),
                (points[1].y - points[0].y).max(1),
                SWP_NOACTIVATE | SWP_NOZORDER,
            )
            .map_err(|error| format!("failed to resize attached wallpaper window: {error}"))?;
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
        Ok(())
    }

    fn find_wallpaper_workerw() -> Result<HWND, String> {
        let progman = unsafe { FindWindowW(w!("Progman"), PCWSTR::null()) }
            .map_err(|error| format!("desktop Progman window was not found: {error}"))?;
        if progman.0.is_null() {
            return Err("desktop Progman window was not found".to_string());
        }

        unsafe {
            SendMessageTimeoutW(
                progman,
                0x052c,
                WPARAM(0x0d),
                LPARAM(0x01),
                SMTO_NORMAL,
                1000,
                None,
            );
        }

        if let Some(workerw) = find_workerw_after_shell_view() {
            return Ok(workerw);
        }

        let workerw = unsafe { FindWindowExW(Some(progman), None, w!("WorkerW"), PCWSTR::null()) }
            .unwrap_or_else(|_| HWND(std::ptr::null_mut()));
        if !workerw.0.is_null() {
            return Ok(workerw);
        }

        Ok(progman)
    }

    fn find_workerw_after_shell_view() -> Option<HWND> {
        let mut search = WorkerSearch {
            workerw: HWND(std::ptr::null_mut()),
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_for_workerw),
                LPARAM(&mut search as *mut _ as isize),
            );
        }
        if search.workerw.0.is_null() {
            None
        } else {
            Some(search.workerw)
        }
    }

    unsafe extern "system" fn enum_windows_for_workerw(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let shell = unsafe {
            FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), PCWSTR::null())
                .unwrap_or_else(|_| HWND(std::ptr::null_mut()))
        };
        if !shell.0.is_null() {
            let search = unsafe { &mut *(lparam.0 as *mut WorkerSearch) };
            search.workerw = unsafe {
                FindWindowExW(None, Some(hwnd), w!("WorkerW"), PCWSTR::null())
                    .unwrap_or_else(|_| HWND(std::ptr::null_mut()))
            };
        }
        true.into()
    }

    fn should_pause_wallpaper<R: Runtime>(app: &tauri::AppHandle<R>) -> bool {
        if app.get_webview_window(WALLPAPER_WINDOW_LABEL).is_none() {
            return false;
        }

        let hwnd = unsafe { GetForegroundWindow() };
        if hwnd.0.is_null() || is_desktop_shell_window(hwnd) {
            return false;
        }

        if unsafe { IsZoomed(hwnd).as_bool() } {
            return true;
        }

        let mut rect = RECT::default();
        if unsafe { GetWindowRect(hwnd, &mut rect) }.is_err() {
            return false;
        }

        let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
        if monitor.0.is_null() {
            return false;
        }
        let mut info = MONITORINFO {
            cbSize: mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !unsafe { GetMonitorInfoW(monitor, &mut info).as_bool() } {
            return false;
        }

        rect_covers(rect, info.rcMonitor, 2)
    }

    fn is_desktop_shell_window(hwnd: HWND) -> bool {
        let mut class_name = [0u16; 128];
        let length = unsafe { GetClassNameW(hwnd, &mut class_name) };
        if length <= 0 {
            return false;
        }
        let name = String::from_utf16_lossy(&class_name[..length as usize]);
        matches!(
            name.as_str(),
            "Progman" | "WorkerW" | "SHELLDLL_DefView" | "Shell_TrayWnd"
        )
    }

    fn expanded_virtual_screen_bounds() -> RECT {
        let bounds = virtual_screen_bounds();
        RECT {
            left: bounds.left - WALLPAPER_OVERSCAN_PX,
            top: bounds.top - WALLPAPER_OVERSCAN_PX,
            right: bounds.right + WALLPAPER_OVERSCAN_PX,
            bottom: bounds.bottom + WALLPAPER_OVERSCAN_PX,
        }
    }

    fn virtual_screen_bounds() -> RECT {
        unsafe {
            let left = GetSystemMetrics(SM_XVIRTUALSCREEN);
            let top = GetSystemMetrics(SM_YVIRTUALSCREEN);
            RECT {
                left,
                top,
                right: left + GetSystemMetrics(SM_CXVIRTUALSCREEN).max(1),
                bottom: top + GetSystemMetrics(SM_CYVIRTUALSCREEN).max(1),
            }
        }
    }

    fn rect_covers(rect: RECT, target: RECT, tolerance: i32) -> bool {
        rect.left <= target.left + tolerance
            && rect.top <= target.top + tolerance
            && rect.right >= target.right - tolerance
            && rect.bottom >= target.bottom - tolerance
    }

    fn rect_width(rect: RECT) -> i32 {
        (rect.right - rect.left).max(1)
    }

    fn rect_height(rect: RECT) -> i32 {
        (rect.bottom - rect.top).max(1)
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    pub fn set<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<(), String> {
        Err("desktop wallpaper hosting is only available on Windows".to_string())
    }

    pub fn clear<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<(), String> {
        Ok(())
    }

    pub fn start_pause_monitor<R: tauri::Runtime>(_app: tauri::AppHandle<R>) {}
}

pub(crate) fn set_wallpaper<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    platform::set(app)
}

pub(crate) fn clear_wallpaper<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    platform::clear(app)
}

pub(crate) fn start_pause_monitor<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    PAUSE_MONITOR.call_once(|| platform::start_pause_monitor(app));
}
