//! Title-bar setup for the main window. KKTerm always uses the custom
//! React-painted title bar, so system decorations are removed and Win11 rounded
//! corners are reinstated via DwmSetWindowAttribute.

pub fn apply_title_bar_mode<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    if let Err(error) = window.set_decorations(false) {
        eprintln!("title-bar mode: set_decorations failed: {error}");
    }

    apply_main_window_backdrop(window);
}

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
