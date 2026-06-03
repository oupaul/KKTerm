use std::sync::Once;

pub(crate) const WALLPAPER_SETTINGS_EVENT: &str = "kkterm://desktop-wallpaper-settings";
pub(crate) const WALLPAPER_PAUSED_EVENT: &str = "kkterm://desktop-wallpaper-paused";

static PAUSE_MONITOR: Once = Once::new();

#[derive(Clone, Copy)]
pub(crate) struct WallpaperPickerAnchor {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

pub(crate) fn wallpaper_picker_anchor_from_rect(rect: tauri::Rect) -> WallpaperPickerAnchor {
    let position = match rect.position {
        tauri::Position::Physical(position) => (position.x as f64, position.y as f64),
        tauri::Position::Logical(position) => (position.x, position.y),
    };
    let size = match rect.size {
        tauri::Size::Physical(size) => (size.width as f64, size.height as f64),
        tauri::Size::Logical(size) => (size.width, size.height),
    };
    WallpaperPickerAnchor {
        x: position.0,
        y: position.1,
        width: size.0,
        height: size.1,
    }
}

#[cfg(target_os = "windows")]
mod platform {
    use std::{mem, thread, time::Duration};

    use tauri::{Emitter, LogicalPosition, Manager, Runtime, WebviewWindowBuilder};
    use windows::{
        Win32::{
            Foundation::{HWND, LPARAM, POINT, RECT, WPARAM},
            Graphics::Gdi::{
                GetMonitorInfoW, MapWindowPoints, MonitorFromWindow, MONITORINFO,
                MONITOR_DEFAULTTONEAREST,
            },
            UI::WindowsAndMessaging::{
                EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetForegroundWindow,
                GetSystemMetrics, GetWindowLongPtrW, GetWindowRect, IsZoomed,
                SendMessageTimeoutW, SetParent, SetWindowLongPtrW, SetWindowPos, ShowWindow,
                GWL_EXSTYLE, SMTO_NORMAL, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
                SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SWP_FRAMECHANGED, SWP_NOACTIVATE,
                SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SWP_NOZORDER, SW_SHOWNOACTIVATE,
                WS_EX_APPWINDOW, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
            },
        },
        core::{w, BOOL, PCWSTR},
    };

    use super::{WallpaperPickerAnchor, WALLPAPER_PAUSED_EVENT, WALLPAPER_SETTINGS_EVENT};

    const WALLPAPER_WINDOW_LABEL: &str = "kkterm-wallpaper";
    const WALLPAPER_ROUTE: &str = "index.html#/wallpaper";
    const WALLPAPER_PICKER_WINDOW_LABEL: &str = "kkterm-wallpaper-picker";
    const WALLPAPER_PICKER_ROUTE: &str = "index.html#/wallpaper-picker";
    const WALLPAPER_OVERSCAN_PX: i32 = 4;
    const WALLPAPER_PICKER_WIDTH: f64 = 360.0;
    const WALLPAPER_PICKER_HEIGHT: f64 = 540.0;
    const WALLPAPER_PICKER_GAP: f64 = 8.0;
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
        .focusable(false)
        .focused(false)
        .disable_drag_drop_handler()
        .build()
        .map_err(|error| format!("failed to create wallpaper window: {error}"))?;

        let handle = window
            .hwnd()
            .map_err(|error| format!("failed to read wallpaper window handle: {error}"))?;
        let hwnd = HWND(handle.0);
        configure_wallpaper_window(hwnd);
        attach_wallpaper_window(hwnd, bounds)?;
        let _ = app.emit(WALLPAPER_SETTINGS_EVENT, ());
        Ok(())
    }

    pub fn open_picker<R: Runtime>(
        app: &tauri::AppHandle<R>,
        anchor: Option<WallpaperPickerAnchor>,
    ) -> Result<(), String> {
        let (x, y) = picker_position(anchor);
        if let Some(window) = app.get_webview_window(WALLPAPER_PICKER_WINDOW_LABEL) {
            window
                .set_position(LogicalPosition::new(x, y))
                .map_err(|error| format!("failed to position wallpaper picker: {error}"))?;
            window
                .show()
                .map_err(|error| format!("failed to show wallpaper picker: {error}"))?;
            window
                .set_focus()
                .map_err(|error| format!("failed to focus wallpaper picker: {error}"))?;
            return Ok(());
        }

        let window = WebviewWindowBuilder::new(
            app,
            WALLPAPER_PICKER_WINDOW_LABEL,
            tauri::WebviewUrl::App(WALLPAPER_PICKER_ROUTE.into()),
        )
        .title("KKTerm Wallpaper")
        .position(x, y)
        .inner_size(WALLPAPER_PICKER_WIDTH, WALLPAPER_PICKER_HEIGHT)
        .decorations(false)
        .resizable(false)
        .visible(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .focused(true)
        .disable_drag_drop_handler()
        .build()
        .map_err(|error| format!("failed to create wallpaper picker: {error}"))?;
        window
            .show()
            .map_err(|error| format!("failed to show wallpaper picker: {error}"))?;
        window
            .set_focus()
            .map_err(|error| format!("failed to focus wallpaper picker: {error}"))?;
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

    fn configure_wallpaper_window(hwnd: HWND) {
        unsafe {
            let current = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let next = (current | WS_EX_NOACTIVATE.0 as isize | WS_EX_TOOLWINDOW.0 as isize)
                & !(WS_EX_APPWINDOW.0 as isize);
            let _ = SetWindowLongPtrW(hwnd, GWL_EXSTYLE, next);
            let _ = SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
            );
        }
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
                SWP_NOACTIVATE | SWP_NOOWNERZORDER | SWP_NOZORDER,
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

    fn picker_position(anchor: Option<WallpaperPickerAnchor>) -> (f64, f64) {
        let bounds = virtual_screen_bounds();
        let min_x = bounds.left as f64 + WALLPAPER_PICKER_GAP;
        let max_x = bounds.right as f64 - WALLPAPER_PICKER_WIDTH - WALLPAPER_PICKER_GAP;
        let min_y = bounds.top as f64 + WALLPAPER_PICKER_GAP;
        let max_y = bounds.bottom as f64 - WALLPAPER_PICKER_HEIGHT - WALLPAPER_PICKER_GAP;
        let default_x = max_x.max(min_x);
        let default_y = max_y.max(min_y);

        let Some(anchor) = anchor else {
            return (default_x, default_y);
        };

        let x = (anchor.x + anchor.width - WALLPAPER_PICKER_WIDTH).clamp(min_x, default_x);
        let above = anchor.y - WALLPAPER_PICKER_HEIGHT - WALLPAPER_PICKER_GAP;
        let below = anchor.y + anchor.height + WALLPAPER_PICKER_GAP;
        let y = if above >= min_y { above } else { below }.clamp(min_y, default_y);
        (x, y)
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
    use super::WallpaperPickerAnchor;

    pub fn open_picker<R: tauri::Runtime>(
        _app: &tauri::AppHandle<R>,
        _anchor: Option<WallpaperPickerAnchor>,
    ) -> Result<(), String> {
        Err("desktop wallpaper picker is only available on Windows".to_string())
    }

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

pub(crate) fn open_wallpaper_picker<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    anchor: Option<WallpaperPickerAnchor>,
) -> Result<(), String> {
    platform::open_picker(app, anchor)
}

pub(crate) fn clear_wallpaper<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    platform::clear(app)
}

pub(crate) fn start_pause_monitor<R: tauri::Runtime>(app: tauri::AppHandle<R>) {
    PAUSE_MONITOR.call_once(|| platform::start_pause_monitor(app));
}
