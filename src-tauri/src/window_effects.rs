//! Title-bar mode switching for the main window. When the user opts into the
//! custom React-painted title bar, system decorations are removed and Win11
//! rounded corners are reinstated via DwmSetWindowAttribute. When opting out,
//! decorations are restored so the OS provides its native frame.

pub fn apply_title_bar_mode<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    use_custom_title_bar: bool,
) {
    if let Err(error) = window.set_decorations(!use_custom_title_bar) {
        eprintln!("title-bar mode: set_decorations failed: {error}");
    }

    if use_custom_title_bar {
        apply_main_window_backdrop(window);
    }
}

#[cfg(target_os = "windows")]
pub fn apply_main_window_backdrop<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
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
