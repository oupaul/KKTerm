#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeTooltipRequest {
    label: String,
    x: f64,
    y: f64,
}

#[cfg(target_os = "windows")]
mod platform {
    use super::NativeTooltipRequest;
    use std::sync::Mutex;
    use tauri::Manager;
    use windows::Win32::Foundation::{HWND, LPARAM, RECT, WPARAM};
    use windows::Win32::UI::Controls::{
        TOOLTIPS_CLASSW, TTF_ABSOLUTE, TTF_TRACK, TTM_ADDTOOLW, TTM_SETMAXTIPWIDTH,
        TTM_TRACKACTIVATE, TTM_TRACKPOSITION, TTS_ALWAYSTIP, TTS_NOPREFIX, TTTOOLINFOW,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, SendMessageW, CW_USEDEFAULT, WINDOW_STYLE,
        WS_EX_TOPMOST, WS_POPUP,
    };
    use windows_core::PWSTR;

    #[derive(Default)]
    pub struct NativeTooltipState {
        tooltip_hwnd: Option<isize>,
        label_utf16: Vec<u16>,
    }

    pub type SharedNativeTooltipState = Mutex<NativeTooltipState>;

    pub fn new_state() -> SharedNativeTooltipState {
        Mutex::new(NativeTooltipState::default())
    }

    pub fn show(
        app: tauri::AppHandle,
        state: tauri::State<'_, SharedNativeTooltipState>,
        request: NativeTooltipRequest,
    ) -> Result<bool, String> {
        let window = app
            .get_window(crate::window_state::MAIN_WINDOW_LABEL)
            .ok_or_else(|| "main window is not available".to_string())?;
        let inner_position = window
            .inner_position()
            .map_err(|error| format!("failed to resolve window position: {error}"))?;
        let scale_factor = window
            .scale_factor()
            .map_err(|error| format!("failed to resolve window scale factor: {error}"))?;
        let owner = window
            .hwnd()
            .map_err(|error| format!("failed to resolve window handle: {error}"))?;
        let owner_hwnd = HWND(owner.0 as *mut _);

        let mut state = state
            .lock()
            .map_err(|_| "native tooltip state lock poisoned".to_string())?;
        hide_locked(&mut state);

        let label = request.label.trim();
        if label.is_empty() {
            return Ok(false);
        }

        state.label_utf16 = label.encode_utf16().chain(std::iter::once(0)).collect();
        let text_ptr = PWSTR(state.label_utf16.as_mut_ptr());
        let screen_x = inner_position.x + (request.x * scale_factor).round() as i32;
        let screen_y = inner_position.y + (request.y * scale_factor).round() as i32;

        unsafe {
            let tooltip_hwnd = CreateWindowExW(
                WS_EX_TOPMOST,
                TOOLTIPS_CLASSW,
                None,
                WINDOW_STYLE(WS_POPUP.0 | TTS_ALWAYSTIP | TTS_NOPREFIX),
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                Some(owner_hwnd),
                None,
                None,
                None,
            )
            .map_err(|error| format!("failed to create native tooltip: {error}"))?;

            let mut tool_info = TTTOOLINFOW {
                cbSize: std::mem::size_of::<TTTOOLINFOW>() as u32,
                uFlags: TTF_TRACK | TTF_ABSOLUTE,
                hwnd: owner_hwnd,
                uId: 1,
                rect: RECT::default(),
                hinst: Default::default(),
                lpszText: text_ptr,
                lParam: LPARAM(0),
                lpReserved: std::ptr::null_mut(),
            };

            SendMessageW(
                tooltip_hwnd,
                TTM_ADDTOOLW,
                Some(WPARAM(0)),
                Some(LPARAM((&mut tool_info as *mut TTTOOLINFOW) as isize)),
            );
            SendMessageW(
                tooltip_hwnd,
                TTM_SETMAXTIPWIDTH,
                Some(WPARAM(0)),
                Some(LPARAM((360.0 * scale_factor).round() as isize)),
            );
            SendMessageW(
                tooltip_hwnd,
                TTM_TRACKPOSITION,
                Some(WPARAM(0)),
                Some(LPARAM(make_lparam(screen_x, screen_y))),
            );
            SendMessageW(
                tooltip_hwnd,
                TTM_TRACKACTIVATE,
                Some(WPARAM(1)),
                Some(LPARAM((&mut tool_info as *mut TTTOOLINFOW) as isize)),
            );

            state.tooltip_hwnd = Some(tooltip_hwnd.0 as isize);
        }

        Ok(true)
    }

    pub fn hide(state: tauri::State<'_, SharedNativeTooltipState>) -> Result<(), String> {
        let mut state = state
            .lock()
            .map_err(|_| "native tooltip state lock poisoned".to_string())?;
        hide_locked(&mut state);
        Ok(())
    }

    fn hide_locked(state: &mut NativeTooltipState) {
        if let Some(hwnd) = state.tooltip_hwnd.take() {
            unsafe {
                let _ = DestroyWindow(HWND(hwnd as *mut _));
            }
        }
        state.label_utf16.clear();
    }

    fn make_lparam(x: i32, y: i32) -> isize {
        ((y as u16 as u32) << 16 | (x as u16 as u32)) as isize
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::NativeTooltipRequest;
    use std::sync::Mutex;

    #[derive(Default)]
    pub struct NativeTooltipState;
    pub type SharedNativeTooltipState = Mutex<NativeTooltipState>;

    pub fn new_state() -> SharedNativeTooltipState {
        Mutex::new(NativeTooltipState)
    }

    pub fn show(
        _app: tauri::AppHandle,
        _state: tauri::State<'_, SharedNativeTooltipState>,
        _request: NativeTooltipRequest,
    ) -> Result<bool, String> {
        Ok(false)
    }

    pub fn hide(_state: tauri::State<'_, SharedNativeTooltipState>) -> Result<(), String> {
        Ok(())
    }
}

pub use platform::{hide, new_state, show, SharedNativeTooltipState};
