const WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: &str = "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS";
const WEBVIEW2_DISABLE_GPU_ARG: &str = "--disable-gpu";

pub(crate) fn apply_startup_workarounds() {
    apply_remote_desktop_gpu_workaround();
}

#[cfg(target_os = "windows")]
fn apply_remote_desktop_gpu_workaround() {
    if !is_remote_desktop_session() {
        return;
    }

    let current = std::env::var(WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS).unwrap_or_default();
    let merged = append_browser_arg_once(&current, WEBVIEW2_DISABLE_GPU_ARG);
    if merged == current {
        return;
    }

    // Startup runs before Tauri creates worker threads or WebView2 environments.
    unsafe {
        std::env::set_var(WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS, &merged);
    }
    eprintln!("enabled WebView2 remote desktop GPU workaround");
}

#[cfg(not(target_os = "windows"))]
fn apply_remote_desktop_gpu_workaround() {}

#[cfg(target_os = "windows")]
fn is_remote_desktop_session() -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_REMOTESESSION};

    if unsafe { GetSystemMetrics(SM_REMOTESESSION) } != 0 {
        return true;
    }

    std::env::var("SESSIONNAME")
        .map(|value| value.to_ascii_uppercase().starts_with("RDP-"))
        .unwrap_or(false)
}

fn append_browser_arg_once(current: &str, arg: &str) -> String {
    if current.split_whitespace().any(|part| part == arg) {
        return current.to_string();
    }
    if current.trim().is_empty() {
        return arg.to_string();
    }
    format!("{} {}", current.trim(), arg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_disable_gpu_to_empty_arguments() {
        assert_eq!(
            append_browser_arg_once("", WEBVIEW2_DISABLE_GPU_ARG),
            WEBVIEW2_DISABLE_GPU_ARG
        );
    }

    #[test]
    fn appends_disable_gpu_to_existing_arguments() {
        assert_eq!(
            append_browser_arg_once("--foo=bar", WEBVIEW2_DISABLE_GPU_ARG),
            "--foo=bar --disable-gpu"
        );
    }

    #[test]
    fn does_not_duplicate_disable_gpu() {
        assert_eq!(
            append_browser_arg_once("--foo=bar --disable-gpu", WEBVIEW2_DISABLE_GPU_ARG),
            "--foo=bar --disable-gpu"
        );
    }
}
