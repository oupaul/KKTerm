//! Title-bar setup for the main window. KKTerm uses a custom React-painted title
//! bar. On Windows/Linux system decorations are removed entirely (and Win11
//! rounded corners are reinstated via DwmSetWindowAttribute). On macOS the native
//! traffic-light controls are kept via the overlay title-bar style applied at
//! window-build time, so decorations must NOT be stripped here.

pub fn apply_title_bar_mode<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    #[cfg(not(target_os = "macos"))]
    if let Err(error) = window.set_decorations(false) {
        eprintln!("title-bar mode: set_decorations failed: {error}");
    }

    apply_main_window_backdrop(window);
    neutralize_drag_resize_focus(window);
}

// An undecorated, resizable window makes tauri-runtime-wry attach a focusable
// child window (class/title "TAURI_DRAG_RESIZE_WINDOW") that proxies edge-resize
// hit-testing. It is created without WS_EX_NOACTIVATE, so it can hold the Win32
// keyboard focus; once it does, it becomes the frame's saved focus target and
// the OS restores focus to it — not the WebView2 content — every time the app is
// re-activated (minimize/restore, Alt+Tab). The terminal then keeps DOM focus
// yet never receives WM_KEYDOWN. A window with a native title bar has no such
// child, which is why it restores focus correctly. Mark the helper
// non-activating so it can never become the focus target; resize hit-testing
// (WM_NCHITTEST / WM_NCLBUTTONDOWN, which it forwards to the parent) is
// unaffected because that path does not require focus or activation.
#[cfg(target_os = "windows")]
fn neutralize_drag_resize_focus<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GW_CHILD, GW_HWNDNEXT, GetWindow, GetWindowLongPtrW, GetWindowTextW,
        SetWindowLongPtrW, WS_EX_NOACTIVATE,
    };

    let parent = match window.hwnd() {
        Ok(handle) => HWND(handle.0 as *mut _),
        Err(_) => return,
    };

    unsafe {
        let mut child = match GetWindow(parent, GW_CHILD) {
            Ok(hwnd) => hwnd,
            Err(_) => return,
        };
        loop {
            let mut text = [0u16; 32];
            let len = GetWindowTextW(child, &mut text);
            if len > 0
                && String::from_utf16_lossy(&text[..len as usize]) == "TAURI_DRAG_RESIZE_WINDOW"
            {
                let ex_style = GetWindowLongPtrW(child, GWL_EXSTYLE);
                let next = ex_style | WS_EX_NOACTIVATE.0 as isize;
                if next != ex_style {
                    SetWindowLongPtrW(child, GWL_EXSTYLE, next);
                }
                break;
            }
            match GetWindow(child, GW_HWNDNEXT) {
                Ok(next) => child = next,
                Err(_) => break,
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn neutralize_drag_resize_focus<R: tauri::Runtime>(_window: &tauri::WebviewWindow<R>) {}

#[cfg(target_os = "windows")]
pub fn apply_main_window_backdrop<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND, DwmSetWindowAttribute,
    };

    let hwnd = match window.hwnd() {
        Ok(handle) => HWND(handle.0 as *mut _),
        Err(error) => {
            eprintln!("window backdrop: failed to obtain HWND: {error}");
            return;
        }
    };

    let preference: i32 = DWMWCP_ROUND.0;

    unsafe {
        if let Err(error) = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const _,
            std::mem::size_of::<i32>() as u32,
        ) {
            eprintln!("window backdrop: rounded corners failed: {error}");
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn apply_main_window_backdrop<R: tauri::Runtime>(_window: &tauri::WebviewWindow<R>) {}
