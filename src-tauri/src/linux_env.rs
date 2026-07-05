// Shared AppImage environment sanitizing for children that execute *host*
// binaries. The AppImage AppRun wrapper and its bundled linuxdeploy GTK hook
// rewrite the environment so KKTerm loads the bundled GTK/WebKit stack from
// the transient /tmp/.mount_* directory. Host binaries spawned by KKTerm must
// not inherit those values: the bundled libraries come from the build host and
// mismatch the running system (systemd tools abort with `OPENSSL_3.4.0' not
// found` on Fedora 44, ssh silently loads the bundled libcrypto), and the
// rewritten XDG_DATA_DIRS breaks MIME/desktop-file resolution so xdg-open
// falls back to opening everything in the default browser.
//
// Terminal/SSH children go through the CommandBuilder variant in sessions.rs;
// this module holds the shared pieces plus a std::process::Command variant for
// one-shot host spawns (App Launcher, openers).

/// Variables the AppImage tooling overwrites wholesale. The pre-AppImage value
/// is unrecoverable and a plain desktop shell would not have them set, so they
/// are dropped entirely.
#[cfg(any(target_os = "linux", test))]
pub const APPIMAGE_OVERWRITTEN_VARS: [&str; 13] = [
    "APPDIR",
    "APPIMAGE",
    "ARGV0",
    "OWD",
    "GDK_BACKEND",
    "GTK_THEME",
    "GTK_DATA_PREFIX",
    "GTK_EXE_PREFIX",
    "GTK_PATH",
    "GTK_IM_MODULE_FILE",
    "GDK_PIXBUF_MODULE_FILE",
    "GSETTINGS_SCHEMA_DIR",
    "GIO_EXTRA_MODULES",
];

/// Path-list variables the AppImage tooling prepends to. Entries under the
/// mount are filtered out one by one so user-set entries survive.
#[cfg(any(target_os = "linux", test))]
pub const APPIMAGE_PREPENDED_PATH_VARS: [&str; 2] = ["LD_LIBRARY_PATH", "XDG_DATA_DIRS"];

/// The AppImage mount directory, when running from an AppImage.
#[cfg(target_os = "linux")]
pub fn appimage_dir() -> Option<String> {
    std::env::var("APPDIR")
        .ok()
        .filter(|value| !value.is_empty())
}

/// Drops `:`-separated path entries that point into the AppImage mount,
/// returning `None` when nothing user-provided remains.
#[cfg(any(target_os = "linux", test))]
pub fn filter_appimage_path_list(value: &str, appdir: &str) -> Option<String> {
    let kept = value
        .split(':')
        .filter(|entry| !entry.is_empty() && !entry.starts_with(appdir))
        .collect::<Vec<_>>()
        .join(":");
    (!kept.is_empty()).then_some(kept)
}

/// Spawns a host process with the AppImage environment scrubbed and stdio
/// detached, reaping it from a background thread so short-lived children do
/// not linger as zombies.
#[cfg(target_os = "linux")]
pub fn spawn_detached_host_process(
    mut command: std::process::Command,
) -> Result<(), std::io::Error> {
    use std::process::Stdio;

    sanitize_appimage_environment(&mut command);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let mut child = command.spawn()?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}

/// Scrubs AppImage-injected variables from a host-binary spawn. No-op outside
/// an AppImage (no APPDIR).
#[cfg(target_os = "linux")]
pub fn sanitize_appimage_environment(command: &mut std::process::Command) {
    let Some(appdir) = appimage_dir() else {
        return;
    };

    for name in APPIMAGE_OVERWRITTEN_VARS {
        command.env_remove(name);
    }

    for name in APPIMAGE_PREPENDED_PATH_VARS {
        let Ok(value) = std::env::var(name) else {
            continue;
        };
        match filter_appimage_path_list(&value, &appdir) {
            Some(kept) => command.env(name, kept),
            None => command.env_remove(name),
        };
    }
}
