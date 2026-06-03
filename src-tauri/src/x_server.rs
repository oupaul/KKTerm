use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

const VCXSRV_EXE: &str = "vcxsrv.exe";
const DEFAULT_VCXSRV_ARGS: &str = "-multiwindow -clipboard -wgl";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XServerLaunchResult {
    pub started: bool,
    pub already_running: bool,
    pub executable_path: Option<String>,
    pub display: u16,
}

pub fn launch_vcxsrv_if_needed(
    path_override: Option<&str>,
    display: u16,
    extra_args: Option<&str>,
) -> Result<XServerLaunchResult, String> {
    let display = display.min(99);
    if vcxsrv_is_running() {
        return Ok(XServerLaunchResult {
            started: false,
            already_running: true,
            executable_path: None,
            display,
        });
    }

    let path_override = path_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from);
    let exe = resolve_vcxsrv_path(path_override)?;
    let args = vcxsrv_launch_args(display, extra_args);
    let mut command = Command::new(&exe);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
        .spawn()
        .map_err(|error| format!("failed to launch VcXsrv: {error}"))?;

    Ok(XServerLaunchResult {
        started: true,
        already_running: false,
        executable_path: Some(exe.to_string_lossy().into_owned()),
        display,
    })
}

fn vcxsrv_is_running() -> bool {
    #[cfg(target_os = "windows")]
    {
        let Ok(output) = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq vcxsrv.exe", "/NH"])
            .output()
        else {
            return false;
        };
        if !output.status.success() {
            return false;
        }
        let stdout = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
        stdout.contains(VCXSRV_EXE)
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

fn resolve_vcxsrv_path(path_override: Option<PathBuf>) -> Result<PathBuf, String> {
    vcxsrv_candidate_paths(path_override)
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "VcXsrv was not found. Install it from Installer Helper or set the VcXsrv path in SSH settings.".to_string())
}

fn vcxsrv_candidate_paths(path_override: Option<PathBuf>) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(path) = path_override {
        paths.push(path);
    }
    paths.push(PathBuf::from(r"C:\Program Files\VcXsrv\vcxsrv.exe"));
    paths.push(PathBuf::from(r"C:\Program Files (x86)\VcXsrv\vcxsrv.exe"));
    if let Some(program_files) = std::env::var_os("ProgramFiles").map(PathBuf::from) {
        paths.push(program_files.join("VcXsrv").join(VCXSRV_EXE));
    }
    if let Some(program_files_x86) = std::env::var_os("ProgramFiles(x86)").map(PathBuf::from) {
        paths.push(program_files_x86.join("VcXsrv").join(VCXSRV_EXE));
    }
    dedupe_paths(paths)
}

fn dedupe_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for path in paths {
        if !out.iter().any(|existing| existing == &path) {
            out.push(path);
        }
    }
    out
}

fn vcxsrv_launch_args(display: u16, extra_args: Option<&str>) -> Vec<String> {
    let mut args = vec![format!(":{}", display.min(99))];
    let rest = extra_args
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_VCXSRV_ARGS);
    args.extend(rest.split_whitespace().map(str::to_string));
    args
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn vcxsrv_default_args_use_local_display_multiwindow_and_clipboard() {
        let args = vcxsrv_launch_args(0, None);

        assert_eq!(args, vec![":0", "-multiwindow", "-clipboard", "-wgl"]);
    }

    #[test]
    fn vcxsrv_custom_args_split_shell_words_after_display() {
        let args = vcxsrv_launch_args(2, Some("-multiwindow -clipboard -nowgl"));

        assert_eq!(args, vec![":2", "-multiwindow", "-clipboard", "-nowgl"]);
    }

    #[test]
    fn vcxsrv_candidates_prefer_user_path_then_standard_installs() {
        let user_path = PathBuf::from(r"C:\Tools\VcXsrv\vcxsrv.exe");
        let candidates = vcxsrv_candidate_paths(Some(user_path.clone()));

        assert_eq!(candidates.first(), Some(&user_path));
        assert!(candidates.contains(&PathBuf::from(r"C:\Program Files\VcXsrv\vcxsrv.exe")));
        assert!(candidates.contains(&PathBuf::from(
            r"C:\Program Files (x86)\VcXsrv\vcxsrv.exe"
        )));
    }
}
