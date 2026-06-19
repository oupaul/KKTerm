#![allow(unused_imports)]
use super::*;

pub(crate) fn list_custom_fonts_sync(
    app: &tauri::AppHandle,
) -> Result<Vec<CustomFontEntry>, String> {
    let folder = custom_fonts_folder(app)?;
    fs::create_dir_all(&folder).map_err(|error| {
        format!(
            "failed to create custom fonts folder {}: {error}",
            folder.display()
        )
    })?;

    let mut fonts = fs::read_dir(&folder)
        .map_err(|error| {
            format!(
                "failed to read custom fonts folder {}: {error}",
                folder.display()
            )
        })?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| custom_font_entry(entry.path()))
        .collect::<Vec<_>>();

    fonts.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(fonts)
}

pub(crate) fn load_custom_font_data_sync(
    app: &tauri::AppHandle,
    path: String,
) -> Result<CustomFontData, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    let folder = custom_fonts_folder(app)?;
    fs::create_dir_all(&folder).map_err(|error| {
        format!(
            "failed to create custom fonts folder {}: {error}",
            folder.display()
        )
    })?;

    let folder = folder
        .canonicalize()
        .map_err(|error| format!("failed to resolve custom fonts folder: {error}"))?;
    let path = PathBuf::from(path);
    let canonical_path = path
        .canonicalize()
        .map_err(|error| format!("failed to resolve custom font path: {error}"))?;

    if !canonical_path.starts_with(&folder) {
        return Err("custom font path must stay inside the fonts folder".to_string());
    }

    if custom_font_entry(canonical_path.clone()).is_none() {
        return Err("custom font file must be .ttf, .otf, .woff, or .woff2".to_string());
    }

    let bytes = fs::read(&canonical_path).map_err(|error| {
        format!(
            "failed to read custom font {}: {error}",
            canonical_path.display()
        )
    })?;

    Ok(CustomFontData {
        data_base64: STANDARD.encode(bytes),
    })
}

/// Root directory for user-writable media (fonts, dashboard backgrounds).
///
/// On macOS the `.app` bundle is read-only and code-signed, and on Linux the
/// AppImage runs from a read-only squashfs mount (`.deb`/`.rpm` install to a
/// root-owned `/usr/bin`), so media cannot live next to the executable as it
/// does on Windows. Use the writable app-data directory there instead, which
/// the `$APPDATA/<dir>/**/*` asset-protocol scopes in `tauri.conf.json` match
/// (`~/Library/Application Support/<id>` on macOS, `~/.local/share/<id>` on
/// Linux).
#[cfg(not(target_os = "windows"))]
fn media_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))
}

/// Windows keeps media next to the executable: the installer is a per-user
/// (`currentUser`) install under `%LOCALAPPDATA%`, so the executable directory
/// is already writable. This is covered by the `$RESOURCE/<dir>/**/*` scopes.
#[cfg(target_os = "windows")]
fn media_root(_app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve app executable path: {error}"))?;
    exe_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "failed to resolve app executable folder".to_string())
}

pub(crate) fn custom_fonts_folder(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(media_root(app)?.join("fonts"))
}

pub(crate) fn backgrounds_folder(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(media_root(app)?.join("backgrounds"))
}

/// Best-effort: delete background media files no view references anymore.
/// Never returns an error — cleanup failures must not break view mutations.
pub(crate) fn prune_unreferenced_backgrounds(app: &tauri::AppHandle) {
    let storage = app.state::<storage::Storage>();
    let referenced = storage.with_connection_infallible(|conn| {
        dashboard_storage::referenced_background_image_files(conn)
            .map_err(|error| format!("{error:?}"))
    });
    let referenced = match referenced {
        Ok(set) => set,
        Err(error) => {
            eprintln!("background prune skipped: {error}");
            return;
        }
    };
    let folder = match backgrounds_folder(app) {
        Ok(folder) => folder,
        Err(error) => {
            eprintln!("background prune skipped: {error}");
            return;
        }
    };
    let entries = match fs::read_dir(&folder) {
        Ok(entries) => entries,
        Err(_) => return, // folder may not exist yet — nothing to prune.
    };
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        if !referenced.contains(&name) {
            if let Err(error) = fs::remove_file(&path) {
                eprintln!(
                    "failed to prune background image {}: {error}",
                    path.display()
                );
            }
        }
    }
}

pub(crate) fn custom_font_entry(path: PathBuf) -> Option<CustomFontEntry> {
    if !path.is_file() {
        return None;
    }

    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())?;

    if !is_supported_font_extension(&extension) {
        return None;
    }

    let name = path
        .file_stem()
        .and_then(|name| name.to_str())
        .or_else(|| path.file_name().and_then(|name| name.to_str()))?
        .to_string();
    let (family, weight, style, is_monospaced) = fs::read(&path)
        .ok()
        .and_then(|data| custom_font_metadata(&data))
        .unwrap_or_else(|| (name.clone(), 400, "normal".to_string(), false));

    Some(CustomFontEntry {
        name,
        family,
        path: path.to_string_lossy().into_owned(),
        extension,
        weight,
        style,
        is_monospaced,
    })
}

fn custom_font_metadata(data: &[u8]) -> Option<(String, u16, String, bool)> {
    let face = ttf_parser::Face::parse(data, 0).ok()?;
    let family = preferred_face_family_name(&face)?;
    let style = if face.is_italic() { "italic" } else { "normal" };
    Some((
        family,
        face.weight().to_number(),
        style.to_string(),
        face.is_monospaced(),
    ))
}

pub(crate) fn is_supported_font_extension(extension: &str) -> bool {
    matches!(extension, "ttf" | "otf" | "woff" | "woff2")
}

/// Enumerate the font family names installed on the operating system.
///
/// Walks the platform font directories and reads each font file's `name` table
/// with `ttf-parser`, preferring English metadata first and typographic family
/// names over legacy family names when language priority ties. The result is a
/// sorted, de-duplicated list. This is intentionally a pure-Rust scan so the
/// build stays free of native font-config / DirectWrite / Core Text deps; it
/// runs off the UI thread on explicit refresh only.
pub(crate) fn list_system_fonts_sync() -> Vec<String> {
    use std::collections::BTreeSet;

    let mut families: BTreeSet<String> = BTreeSet::new();
    for dir in system_font_directories() {
        collect_fonts_in_dir(&dir, 0, &mut families);
    }
    families.into_iter().collect()
}

fn system_font_directories() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let windir = std::env::var_os("WINDIR")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("C:\\Windows"));
        dirs.push(windir.join("Fonts"));
        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            dirs.push(PathBuf::from(local).join("Microsoft\\Windows\\Fonts"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        dirs.push(PathBuf::from("/System/Library/Fonts"));
        dirs.push(PathBuf::from("/Library/Fonts"));
        if let Some(home) = std::env::var_os("HOME") {
            dirs.push(PathBuf::from(home).join("Library/Fonts"));
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        dirs.push(PathBuf::from("/usr/share/fonts"));
        dirs.push(PathBuf::from("/usr/local/share/fonts"));
        let data_home = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share"))
            });
        if let Some(data_home) = data_home {
            dirs.push(data_home.join("fonts"));
        }
        if let Some(home) = std::env::var_os("HOME") {
            dirs.push(PathBuf::from(home).join(".fonts"));
        }
    }

    dirs
}

fn collect_fonts_in_dir(dir: &Path, depth: usize, out: &mut std::collections::BTreeSet<String>) {
    // Bound recursion so a symlink cycle inside a font directory cannot loop.
    if depth > 8 {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return, // directory may not exist on this machine.
    };
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if path.is_dir() {
            collect_fonts_in_dir(&path, depth + 1, out);
        } else if path.is_file() && is_system_font_file(&path) {
            if let Ok(data) = fs::read(&path) {
                collect_family_names(&data, out);
            }
        }
    }
}

fn is_system_font_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_lowercase())
            .as_deref(),
        Some("ttf" | "otf" | "ttc" | "otc")
    )
}

fn collect_family_names(data: &[u8], out: &mut std::collections::BTreeSet<String>) {
    let face_count = ttf_parser::fonts_in_collection(data).unwrap_or(1).max(1);
    for index in 0..face_count {
        let face = match ttf_parser::Face::parse(data, index) {
            Ok(face) => face,
            Err(_) => continue,
        };
        if let Some(name) = preferred_face_family_name(&face) {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                out.insert(trimmed.to_string());
            }
        }
    }
}

fn preferred_face_family_name(face: &ttf_parser::Face<'_>) -> Option<String> {
    let mut candidates: Vec<FontFamilyNameCandidate> = Vec::new();
    for name in face.names() {
        if !matches!(
            name.name_id,
            ttf_parser::name_id::TYPOGRAPHIC_FAMILY | ttf_parser::name_id::FAMILY
        ) {
            continue;
        }
        let Some(decoded) = name.to_string() else {
            continue;
        };
        candidates.push(FontFamilyNameCandidate::new(
            decoded,
            name.name_id,
            name.platform_id == ttf_parser::PlatformId::Windows
                && name.language_id & 0x03ff == 0x09,
        ));
    }
    preferred_family_name(candidates)
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct FontFamilyNameCandidate {
    value: String,
    name_id: u16,
    is_english: bool,
}

impl FontFamilyNameCandidate {
    fn new(value: String, name_id: u16, is_english: bool) -> Self {
        Self {
            value,
            name_id,
            is_english,
        }
    }
}

fn preferred_family_name(candidates: Vec<FontFamilyNameCandidate>) -> Option<String> {
    candidates
        .into_iter()
        .filter(|candidate| !candidate.value.trim().is_empty())
        .min_by_key(|candidate| {
            (
                !candidate.is_english,
                candidate.name_id != ttf_parser::name_id::TYPOGRAPHIC_FAMILY,
            )
        })
        .map(|candidate| candidate.value.trim().to_string())
}

/// Returns the lowercased extension if `path` is a supported background media file.
pub(crate) fn background_media_extension(path: &std::path::Path) -> Option<String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())?;
    if matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "mp4" | "webm" | "mov" | "m4v" | "ogv",
    ) {
        Some(extension)
    } else {
        None
    }
}

pub(crate) fn background_media_mime(extension: &str) -> &'static str {
    match extension {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "ogv" => "video/ogg",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_font_entry_serializes_terminal_monospace_flag() {
        let entry = CustomFontEntry {
            name: "Example-Regular".to_string(),
            family: "Example Mono".to_string(),
            path: "C:/fonts/example.ttf".to_string(),
            extension: "ttf".to_string(),
            weight: 400,
            style: "normal".to_string(),
            is_monospaced: true,
        };

        let value = serde_json::to_value(entry).expect("custom font entry should serialize");

        assert_eq!(value.get("isMonospace"), Some(&serde_json::Value::Bool(true)));
        assert!(value.get("isMonospaced").is_none());
    }
}

pub(crate) fn background_media_extension_error() -> &'static str {
    "background file must be .png, .jpg, .jpeg, .webp, .gif, .bmp, .mp4, .webm, .mov, .m4v, or .ogv"
}

#[cfg(test)]
mod system_font_tests {
    use super::*;

    #[test]
    fn prefers_english_family_name_over_localized_alias() {
        let candidates = vec![
            FontFamilyNameCandidate::new(
                "微軟正黑體".to_string(),
                ttf_parser::name_id::FAMILY,
                false,
            ),
            FontFamilyNameCandidate::new(
                "Microsoft JhengHei".to_string(),
                ttf_parser::name_id::FAMILY,
                true,
            ),
        ];

        assert_eq!(
            preferred_family_name(candidates),
            Some("Microsoft JhengHei".to_string())
        );
    }

    #[test]
    fn prefers_typographic_family_when_language_priority_matches() {
        let candidates = vec![
            FontFamilyNameCandidate::new(
                "Example Legacy".to_string(),
                ttf_parser::name_id::FAMILY,
                true,
            ),
            FontFamilyNameCandidate::new(
                "Example Sans".to_string(),
                ttf_parser::name_id::TYPOGRAPHIC_FAMILY,
                true,
            ),
        ];

        assert_eq!(
            preferred_family_name(candidates),
            Some("Example Sans".to_string())
        );
    }

    #[test]
    fn preserves_first_candidate_on_exact_tie() {
        let candidates = vec![
            FontFamilyNameCandidate::new(
                "First English Family".to_string(),
                ttf_parser::name_id::FAMILY,
                true,
            ),
            FontFamilyNameCandidate::new(
                "Second English Family".to_string(),
                ttf_parser::name_id::FAMILY,
                true,
            ),
        ];

        assert_eq!(
            preferred_family_name(candidates),
            Some("First English Family".to_string())
        );
    }
}
