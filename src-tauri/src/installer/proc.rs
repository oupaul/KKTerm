// Process-spawning helpers shared by detect/check/install code paths.
//
// On Windows, a GUI parent process (Tauri host) spawning a console-subsystem
// child like `winget.exe`, `npm.cmd`, or `dism.exe` causes Windows to
// allocate a console for the child and briefly flash a black cmd window
// on screen. Detection and version-check work runs on Module entry and
// during "Check for updates", so without suppression the user sees several
// console windows flicker every time. `CREATE_NO_WINDOW` (0x0800_0000)
// suppresses the console allocation; on non-Windows targets the helper is
// a no-op.

use std::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Apply the platform-appropriate "do not flash a console window" flag to a
/// `Command` before spawning. Returns the same `Command` for chaining.
pub fn no_window(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}
