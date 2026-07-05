// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    apply_linux_gpu_workarounds();

    kkterm_lib::run()
}

/// WebKitGTK's DMA-BUF renderer silently produces a blank window under
/// virtualized graphics stacks (confirmed on Fedora/Ubuntu VMs: the process
/// and WebKitWebProcess stay alive, nothing crashes, but nothing renders).
/// Disabling it costs a rendering fast path, so it's only applied when a
/// hypervisor is actually detected, not unconditionally. Must run before
/// Tauri/GTK/WebKit touch the display (see docs/LINUX_PORT.md Phase 5/6).
#[cfg(target_os = "linux")]
fn apply_linux_gpu_workarounds() {
    let running_in_vm = std::process::Command::new("systemd-detect-virt")
        .args(["--vm", "--quiet"])
        .status()
        .map(|status| status.success())
        .unwrap_or(false);

    if running_in_vm {
        unsafe {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }
}
