#[cfg(target_os = "windows")]
mod platform {
    use tauri::{Manager, Runtime, WebviewWindowBuilder};
    use windows::{
        core::{w, BOOL, PCWSTR},
        Win32::{
            Foundation::{HWND, LPARAM, POINT, RECT, WPARAM},
            Graphics::Gdi::MapWindowPoints,
            UI::WindowsAndMessaging::{
                EnumWindows, FindWindowExW, FindWindowW, GetSystemMetrics, SendMessageTimeoutW,
                SetParent, SetWindowPos, ShowWindow, SMTO_NORMAL, SM_CXVIRTUALSCREEN,
                SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, SWP_NOACTIVATE,
                SWP_NOZORDER, SW_SHOWNOACTIVATE,
            },
        },
    };

    const WALLPAPER_WINDOW_LABEL: &str = "kkterm-debug-wallpaper";
    const WALLPAPER_ROUTE: &str = "index.html#/wallpaper";

    struct WorkerSearch {
        workerw: HWND,
    }

    pub fn set<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
        clear(app)?;

        let bounds = virtual_screen_bounds();
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
        Ok(())
    }

    pub fn clear<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
        if let Some(window) = app.get_webview_window(WALLPAPER_WINDOW_LABEL) {
            window
                .destroy()
                .map_err(|error| format!("failed to destroy wallpaper window: {error}"))?;
        }
        Ok(())
    }

    fn attach_wallpaper_window(hwnd: HWND, bounds: RECT) -> Result<(), String> {
        let workerw = find_wallpaper_workerw()?;
        unsafe {
            SetWindowPos(
                hwnd,
                None,
                bounds.left,
                bounds.top,
                (bounds.right - bounds.left).max(1),
                (bounds.bottom - bounds.top).max(1),
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
                (bounds.right - bounds.left).max(1),
                (bounds.bottom - bounds.top).max(1),
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
            let _ = EnumWindows(Some(enum_windows_for_workerw), LPARAM(&mut search as *mut _ as isize));
        }
        if search.workerw.0.is_null() {
            None
        } else {
            Some(search.workerw)
        }
    }

    unsafe extern "system" fn enum_windows_for_workerw(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let shell = FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), PCWSTR::null())
            .unwrap_or_else(|_| HWND(std::ptr::null_mut()));
        if !shell.0.is_null() {
            let search = &mut *(lparam.0 as *mut WorkerSearch);
            search.workerw = FindWindowExW(None, Some(hwnd), w!("WorkerW"), PCWSTR::null())
                .unwrap_or_else(|_| HWND(std::ptr::null_mut()));
        }
        true.into()
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
}

#[cfg(not(target_os = "windows"))]
mod platform {
    pub fn set<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<(), String> {
        Err("desktop wallpaper hosting is only available on Windows".to_string())
    }

    pub fn clear<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) -> Result<(), String> {
        Ok(())
    }
}

pub(crate) fn set_debug_wallpaper<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("debug wallpaper is only available in debug builds".to_string());
    }
    platform::set(app)
}

pub(crate) fn clear_debug_wallpaper<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<(), String> {
    platform::clear(app)
}
