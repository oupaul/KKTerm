use crate::storage;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::SystemTime;
#[cfg(not(target_os = "windows"))]
use tauri_plugin_opener::OpenerExt;

const FALLBACK_ICON_DATA_URL: &str = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20x='5'%20y='5'%20width='22'%20height='22'%20rx='5'%20fill='%23eef3fb'%20stroke='%2395a3b8'/%3E%3Cpath%20d='M11%2012h10M11%2016h10M11%2020h6'%20stroke='%23516275'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AppLauncherLaunchMode {
    Normal,
    Admin,
    DifferentUser,
}

#[derive(Debug, PartialEq, Eq)]
pub struct AppLauncherLaunchPlan {
    pub target: String,
    pub parameters: Option<String>,
    pub working_directory: Option<String>,
    pub operation: Option<&'static str>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareAppLauncherEntryRequest {
    path: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAppLauncherEntryRequest {
    path: String,
    arguments: Option<String>,
    working_directory: Option<String>,
    mode: AppLauncherLaunchMode,
}

pub fn prepare_entry(request: PrepareAppLauncherEntryRequest) -> PreparedAppLauncherEntry {
    let path = request.path.trim().to_string();
    let metadata = std::fs::metadata(&path).ok();
    let exists = metadata.is_some();
    let file_kind = match metadata.as_ref() {
        Some(metadata) if metadata.is_dir() => AppLauncherFileKind::Folder,
        Some(_) => AppLauncherFileKind::File,
        None => AppLauncherFileKind::Missing,
    };
    PreparedAppLauncherEntry {
        name: storage::app_launcher_name_from_path(&path),
        exists,
        runnable: is_runnable_path(&path),
        icon_data_url: icon_data_url_for_path(&path),
        extension: path_extension(&path),
        size_bytes: metadata
            .as_ref()
            .filter(|metadata| metadata.is_file())
            .map(|metadata| metadata.len()),
        modified_at_unix_ms: metadata
            .and_then(|metadata| metadata.modified().ok())
            .and_then(system_time_to_unix_ms),
        file_kind,
        path,
    }
}

pub fn launch_entry(
    app: tauri::AppHandle,
    request: LaunchAppLauncherEntryRequest,
) -> Result<(), String> {
    let plan = plan_launch_with_options(
        &request.path,
        request.arguments.as_deref(),
        request.working_directory.as_deref(),
        request.mode,
    )?;
    launch_plan(app, plan)
}

#[cfg(test)]
pub fn plan_launch(
    path: &str,
    mode: AppLauncherLaunchMode,
) -> Result<AppLauncherLaunchPlan, String> {
    plan_launch_with_options(path, None, None, mode)
}

fn plan_launch_with_options(
    path: &str,
    arguments: Option<&str>,
    working_directory: Option<&str>,
    mode: AppLauncherLaunchMode,
) -> Result<AppLauncherLaunchPlan, String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("App Launcher path is required".to_string());
    }

    let runnable = is_runnable_path(path);
    if mode != AppLauncherLaunchMode::Normal && !runnable {
        return Err(
            "Admin and alternate-user launch are only available for runnable files".to_string(),
        );
    }

    let operation = match mode {
        AppLauncherLaunchMode::Normal => None,
        AppLauncherLaunchMode::Admin => Some("runas"),
        AppLauncherLaunchMode::DifferentUser => Some("runasuser"),
    };
    let arguments = arguments.map(str::trim).filter(|value| !value.is_empty());
    let working_directory = working_directory
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    if is_powershell_script(path) {
        let parameters = Some(match arguments {
            Some(arguments) => format!("-File \"{}\" {arguments}", path.replace('"', "\\\"")),
            None => format!("-File \"{}\"", path.replace('"', "\\\"")),
        });
        return Ok(AppLauncherLaunchPlan {
            target: "powershell.exe".to_string(),
            parameters,
            working_directory,
            operation,
        });
    }

    if mode == AppLauncherLaunchMode::Normal && !runnable {
        return Ok(AppLauncherLaunchPlan {
            target: "explorer.exe".to_string(),
            parameters: Some(path.to_string()),
            working_directory,
            operation,
        });
    }

    Ok(AppLauncherLaunchPlan {
        target: path.to_string(),
        parameters: arguments.map(ToOwned::to_owned),
        working_directory,
        operation,
    })
}

fn launch_plan(app: tauri::AppHandle, plan: AppLauncherLaunchPlan) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = app;
        launch_plan_windows(plan)
    }

    #[cfg(not(target_os = "windows"))]
    {
        if plan.operation.is_some() {
            return Err(
                "Admin and alternate-user launch are only available on Windows".to_string(),
            );
        }
        if plan.parameters.is_none() && plan.working_directory.is_none() {
            return app
                .opener()
                .open_path(plan.target, None::<&str>)
                .map_err(|error| format!("failed to open launcher entry: {error}"));
        }
        let mut command = std::process::Command::new(&plan.target);
        if let Some(parameters) = plan.parameters {
            command.arg(parameters);
        }
        if let Some(working_directory) = plan.working_directory {
            command.current_dir(working_directory);
        }
        command
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("failed to launch {}: {error}", plan.target))
    }
}

#[cfg(target_os = "windows")]
fn launch_plan_windows(plan: AppLauncherLaunchPlan) -> Result<(), String> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};

    if plan.operation.is_none() && plan.target.eq_ignore_ascii_case("explorer.exe") {
        let mut command = std::process::Command::new(&plan.target);
        if let Some(parameters) = plan.parameters.as_deref() {
            command.arg(parameters);
        }
        if let Some(working_directory) = plan.working_directory.as_deref() {
            command.current_dir(working_directory);
        }
        return command
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("failed to launch {}: {error}", plan.target));
    }

    let operation = plan.operation.map(wide_string);
    let target = wide_string(&plan.target);
    let parameters = plan.parameters.as_ref().map(|value| wide_string(value));
    let working_directory = plan
        .working_directory
        .as_ref()
        .map(|value| wide_string(value));
    let result = unsafe {
        ShellExecuteW(
            null_mut(),
            operation
                .as_ref()
                .map(|value| value.as_ptr())
                .unwrap_or(null()),
            target.as_ptr(),
            parameters
                .as_ref()
                .map(|value| value.as_ptr())
                .unwrap_or(null()),
            working_directory
                .as_ref()
                .map(|value| value.as_ptr())
                .unwrap_or(null()),
            SW_SHOWNORMAL,
        )
    } as isize;

    if result <= 32 {
        return Err(format!("failed to launch {}", plan.target));
    }

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedAppLauncherEntry {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub runnable: bool,
    pub icon_data_url: Option<String>,
    pub file_kind: AppLauncherFileKind,
    pub extension: Option<String>,
    pub size_bytes: Option<u64>,
    pub modified_at_unix_ms: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AppLauncherFileKind {
    File,
    Folder,
    Missing,
}

fn icon_data_url_for_path(path: &str) -> Option<String> {
    native_icon_data_url(path).or_else(|| Some(FALLBACK_ICON_DATA_URL.to_string()))
}

#[cfg(target_os = "windows")]
fn native_icon_data_url(path: &str) -> Option<String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use image::{codecs::png::PngEncoder, ColorType, ImageEncoder};
    use std::ffi::c_void;
    use std::mem::{size_of, zeroed};
    use std::ptr::null_mut;
    use windows_sys::Win32::Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
        ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows_sys::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL};

    let wide_path = wide_string(path);
    let mut shell_info: SHFILEINFOW = unsafe { zeroed() };
    let info_result = unsafe {
        SHGetFileInfoW(
            wide_path.as_ptr(),
            0,
            &mut shell_info,
            size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };
    if info_result == 0 || shell_info.hIcon.is_null() {
        return None;
    }

    const ICON_SIZE: i32 = 32;
    let screen_hdc = unsafe { GetDC(null_mut()) };
    if screen_hdc.is_null() {
        unsafe {
            DestroyIcon(shell_info.hIcon);
        }
        return None;
    }
    let hdc = unsafe { CreateCompatibleDC(screen_hdc) };
    if hdc.is_null() {
        unsafe {
            ReleaseDC(null_mut(), screen_hdc);
            DestroyIcon(shell_info.hIcon);
        }
        return None;
    }
    let bitmap = unsafe { CreateCompatibleBitmap(screen_hdc, ICON_SIZE, ICON_SIZE) };
    if bitmap.is_null() {
        unsafe {
            DeleteDC(hdc);
            ReleaseDC(null_mut(), screen_hdc);
            DestroyIcon(shell_info.hIcon);
        }
        return None;
    }
    let previous = unsafe { SelectObject(hdc, bitmap) };
    let drawn = unsafe {
        DrawIconEx(
            hdc,
            0,
            0,
            shell_info.hIcon,
            ICON_SIZE,
            ICON_SIZE,
            0,
            null_mut(),
            DI_NORMAL,
        )
    };
    if drawn == 0 {
        unsafe {
            SelectObject(hdc, previous);
            DeleteObject(bitmap);
            DeleteDC(hdc);
            ReleaseDC(null_mut(), screen_hdc);
            DestroyIcon(shell_info.hIcon);
        }
        return None;
    }

    let mut bitmap_info = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: ICON_SIZE,
            biHeight: -ICON_SIZE,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB,
            biSizeImage: 0,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        },
        bmiColors: [unsafe { zeroed() }],
    };
    let mut bgra = vec![0u8; (ICON_SIZE * ICON_SIZE * 4) as usize];
    let read = unsafe {
        GetDIBits(
            hdc,
            bitmap,
            0,
            ICON_SIZE as u32,
            bgra.as_mut_ptr().cast::<c_void>(),
            &mut bitmap_info,
            DIB_RGB_COLORS,
        )
    };

    unsafe {
        SelectObject(hdc, previous);
        DeleteObject(bitmap);
        DeleteDC(hdc);
        ReleaseDC(null_mut(), screen_hdc);
        DestroyIcon(shell_info.hIcon);
    }

    if read == 0 {
        return None;
    }

    let mut rgba = bgra;
    for pixel in rgba.chunks_exact_mut(4) {
        pixel.swap(0, 2);
        if pixel[3] == 0 && (pixel[0] != 0 || pixel[1] != 0 || pixel[2] != 0) {
            pixel[3] = 255;
        }
    }
    if !rgba_has_visible_pixels(&rgba) {
        return None;
    }
    let mut png = Vec::new();
    PngEncoder::new(&mut png)
        .write_image(
            &rgba,
            ICON_SIZE as u32,
            ICON_SIZE as u32,
            ColorType::Rgba8.into(),
        )
        .ok()?;
    Some(format!("data:image/png;base64,{}", STANDARD.encode(png)))
}

#[cfg(not(target_os = "windows"))]
fn native_icon_data_url(_path: &str) -> Option<String> {
    None
}

fn is_runnable_path(path: &str) -> bool {
    matches!(
        path_extension(path).as_deref(),
        Some("exe" | "lnk" | "bat" | "cmd" | "ps1")
    )
}

fn is_powershell_script(path: &str) -> bool {
    path_extension(path).as_deref() == Some("ps1")
}

fn path_extension(path: &str) -> Option<String> {
    Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())
}

fn system_time_to_unix_ms(time: SystemTime) -> Option<u64> {
    let millis = time.duration_since(SystemTime::UNIX_EPOCH).ok()?.as_millis();
    u64::try_from(millis).ok()
}

fn rgba_has_visible_pixels(rgba: &[u8]) -> bool {
    rgba.chunks_exact(4)
        .any(|pixel| pixel[3] > 0 && (pixel[0] != 0 || pixel[1] != 0 || pixel[2] != 0))
}

#[cfg(target_os = "windows")]
fn wide_string(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launch_plan_allows_normal_for_arbitrary_files() {
        let plan = plan_launch("C:\\Docs\\notes.txt", AppLauncherLaunchMode::Normal)
            .expect("normal launches can open associated files");

        assert_eq!(plan.target, "explorer.exe");
        assert_eq!(plan.parameters.as_deref(), Some("C:\\Docs\\notes.txt"));
        assert_eq!(plan.operation, None);
    }

    #[test]
    fn launch_plan_opens_office_documents_through_explorer() {
        let plan = plan_launch("C:\\Docs\\budget.xlsx", AppLauncherLaunchMode::Normal)
            .expect("office documents open through their shell association");

        assert_eq!(plan.target, "explorer.exe");
        assert_eq!(plan.parameters.as_deref(), Some("C:\\Docs\\budget.xlsx"));
        assert_eq!(plan.operation, None);
    }

    #[test]
    fn launch_plan_opens_folders_through_explorer() {
        let plan = plan_launch("C:\\Users\\Ryan\\Documents", AppLauncherLaunchMode::Normal)
            .expect("folders open in File Explorer");

        assert_eq!(plan.target, "explorer.exe");
        assert_eq!(
            plan.parameters.as_deref(),
            Some("C:\\Users\\Ryan\\Documents")
        );
        assert_eq!(plan.operation, None);
    }

    #[test]
    fn launch_plan_limits_admin_to_runnable_files() {
        let plan = plan_launch("C:\\Tools\\script.ps1", AppLauncherLaunchMode::Admin)
            .expect("scripts can use admin launch");

        assert_eq!(plan.target, "powershell.exe");
        assert_eq!(plan.operation, Some("runas"));

        let error = plan_launch("C:\\Docs\\notes.txt", AppLauncherLaunchMode::Admin)
            .expect_err("documents cannot use admin launch");
        assert!(error.contains("only available for runnable files"));
    }

    #[test]
    fn launch_plan_uses_windows_runasuser_verb_for_alternate_user() {
        let plan = plan_launch("C:\\Tools\\tool.exe", AppLauncherLaunchMode::DifferentUser)
            .expect("executables can use alternate-user launch");

        assert_eq!(plan.target, "C:\\Tools\\tool.exe");
        assert_eq!(plan.operation, Some("runasuser"));
    }

    #[test]
    fn visible_icon_pixels_reject_all_transparent_images() {
        assert!(!rgba_has_visible_pixels(&[0, 0, 0, 0, 0, 0, 0, 0]));
        assert!(rgba_has_visible_pixels(&[0, 0, 0, 0, 12, 34, 56, 255]));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn native_icon_data_url_extracts_visible_windows_app_icon() {
        let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let notepad = std::path::Path::new(&system_root)
            .join("System32")
            .join("notepad.exe");
        if !notepad.exists() {
            return;
        }

        let icon_data_url = native_icon_data_url(&notepad.to_string_lossy())
            .expect("notepad icon should be extractable");

        assert!(icon_data_url.starts_with("data:image/png;base64,"));
    }
}
