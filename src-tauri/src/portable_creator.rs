use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

use crate::app_paths::{AppPaths, PORTABLE_MARKER_FILENAME};
use crate::storage::Storage;

static STAGING_COUNTER: AtomicU64 = AtomicU64::new(0);

const PORTABLE_OUTPUT_NAMES: &[&str] = &[
    "KKTerm.exe",
    "kkterm-cli.exe",
    "manual",
    "assistant-skills",
    "data",
    PORTABLE_MARKER_FILENAME,
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePortableCopyRequest {
    destination: String,
    segments: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedPortableCopy {
    destination: String,
    executable: String,
}

struct PortableSources<'a> {
    executable: &'a Path,
    cli: &'a Path,
    manual: &'a Path,
    assistant_skills: &'a Path,
}

#[tauri::command]
pub async fn create_portable_copy(
    app: AppHandle,
    request: CreatePortableCopyRequest,
) -> Result<CreatedPortableCopy, String> {
    crate::run_blocking_database_command("portable copy creation", move || {
        create_portable_copy_sync(&app, request)
    })
    .await
}

#[tauri::command]
pub fn launch_portable_copy(destination: String) -> Result<(), String> {
    let destination = PathBuf::from(destination);
    let marker = destination.join(PORTABLE_MARKER_FILENAME);
    let executable = destination.join("KKTerm.exe");
    if !marker.is_file() || !executable.is_file() {
        return Err("the selected folder is not a complete KKTerm portable copy".to_string());
    }
    Command::new(&executable)
        .current_dir(&destination)
        .spawn()
        .map_err(|error| format!("failed to launch {}: {error}", executable.display()))?;
    Ok(())
}

fn create_portable_copy_sync(
    app: &AppHandle,
    request: CreatePortableCopyRequest,
) -> Result<CreatedPortableCopy, String> {
    if !cfg!(target_os = "windows") {
        return Err("portable copy creation is supported only on Windows".to_string());
    }
    if app.state::<AppPaths>().is_portable() {
        return Err("portable copies can be created only from an installed KKTerm".to_string());
    }
    if request.segments.is_empty() {
        return Err("select at least one category for the portable copy".to_string());
    }

    let current_executable = std::env::current_exe()
        .map_err(|error| format!("failed to resolve the current KKTerm executable: {error}"))?;
    let install_dir = current_executable
        .parent()
        .ok_or_else(|| "failed to resolve the current KKTerm folder".to_string())?;
    let cli = install_dir.join("kkterm-cli.exe");
    if !cli.is_file() {
        return Err(format!(
            "portable CLI resource is missing at {}",
            cli.display()
        ));
    }
    let manual = app
        .path()
        .resolve("manual", BaseDirectory::Resource)
        .map_err(|error| format!("failed to resolve the operation manual: {error}"))?;
    let assistant_skills = app
        .path()
        .resolve("assistant-skills", BaseDirectory::Resource)
        .map_err(|error| format!("failed to resolve Assistant Skills: {error}"))?;
    for (label, path) in [
        ("operation manual", &manual),
        ("Assistant Skills", &assistant_skills),
    ] {
        if !path.is_dir() {
            return Err(format!(
                "portable {label} resource is missing at {}",
                path.display()
            ));
        }
    }

    let destination = prepare_destination(Path::new(&request.destination))?;
    let canonical_install_dir = install_dir
        .canonicalize()
        .map_err(|error| format!("failed to validate the installed KKTerm folder: {error}"))?;
    if destination.starts_with(&canonical_install_dir)
        || canonical_install_dir.starts_with(&destination)
    {
        return Err("choose an empty folder outside the installed KKTerm folder".to_string());
    }

    assemble_portable_copy(
        &app.state::<Storage>(),
        PortableSources {
            executable: &current_executable,
            cli: &cli,
            manual: &manual,
            assistant_skills: &assistant_skills,
        },
        &destination,
        request.segments,
    )?;

    Ok(CreatedPortableCopy {
        destination: destination.display().to_string(),
        executable: destination.join("KKTerm.exe").display().to_string(),
    })
}

fn assemble_portable_copy(
    source_storage: &Storage,
    sources: PortableSources<'_>,
    destination: &Path,
    segments: Vec<String>,
) -> Result<(), String> {
    let staging = create_staging_directory(destination)?;
    let mut moved = Vec::<PathBuf>::new();
    let creation_result = (|| -> Result<(), String> {
        let data_dir = staging.join("data");
        crate::app_paths::prepare_portable_data_dir(&staging, &data_dir)?;
        fs::copy(sources.executable, staging.join("KKTerm.exe"))
            .map_err(|error| format!("failed to copy KKTerm.exe: {error}"))?;
        fs::copy(sources.cli, staging.join("kkterm-cli.exe"))
            .map_err(|error| format!("failed to copy kkterm-cli.exe: {error}"))?;
        copy_directory(sources.manual, &staging.join("manual"))?;
        copy_directory(sources.assistant_skills, &staging.join("assistant-skills"))?;

        crate::selective_export::create_portable_database(
            source_storage,
            &data_dir.join("kkterm.sqlite3"),
            segments,
        )?;
        fs::write(staging.join(PORTABLE_MARKER_FILENAME), b"KKTerm portable\n")
            .map_err(|error| format!("failed to create the portable marker: {error}"))?;

        for name in PORTABLE_OUTPUT_NAMES {
            let source = staging.join(name);
            let target = destination.join(name);
            fs::rename(&source, &target).map_err(|error| {
                format!(
                    "failed to place portable resource {}: {error}",
                    target.display()
                )
            })?;
            moved.push(target);
        }
        Ok(())
    })();

    if let Err(error) = creation_result {
        for path in moved.iter().rev() {
            let _ = remove_owned_path(path);
        }
        let _ = fs::remove_dir_all(&staging);
        return Err(error);
    }
    fs::remove_dir(&staging)
        .map_err(|error| format!("failed to finalize the portable folder: {error}"))?;
    Ok(())
}

fn prepare_destination(path: &Path) -> Result<PathBuf, String> {
    if path.as_os_str().is_empty() || !path.is_absolute() {
        return Err("choose an absolute destination folder".to_string());
    }
    fs::create_dir_all(path).map_err(|error| {
        format!(
            "failed to create destination folder {}: {error}",
            path.display()
        )
    })?;
    let destination = path
        .canonicalize()
        .map_err(|error| format!("failed to validate destination folder: {error}"))?;
    let mut entries = fs::read_dir(&destination).map_err(|error| {
        format!(
            "failed to inspect destination folder {}: {error}",
            destination.display()
        )
    })?;
    if entries
        .next()
        .transpose()
        .map_err(|error| {
            format!(
                "failed to inspect destination folder {}: {error}",
                destination.display()
            )
        })?
        .is_some()
    {
        return Err("the portable destination folder must be empty".to_string());
    }
    Ok(destination)
}

fn create_staging_directory(destination: &Path) -> Result<PathBuf, String> {
    for _ in 0..32 {
        let sequence = STAGING_COUNTER.fetch_add(1, Ordering::Relaxed);
        let staging = destination.join(format!(
            ".kkterm-portable-create-{}-{sequence}",
            std::process::id()
        ));
        match fs::create_dir(&staging) {
            Ok(()) => return Ok(staging),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "failed to create portable staging folder {}: {error}",
                    staging.display()
                ));
            }
        }
    }
    Err("failed to allocate a portable staging folder".to_string())
}

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir(destination).map_err(|error| {
        format!(
            "failed to create portable resource folder {}: {error}",
            destination.display()
        )
    })?;
    for entry in fs::read_dir(source).map_err(|error| {
        format!(
            "failed to read resource folder {}: {error}",
            source.display()
        )
    })? {
        let entry = entry.map_err(|error| format!("failed to read portable resource: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("failed to inspect {}: {error}", entry.path().display()))?;
        let target = destination.join(entry.file_name());
        if file_type.is_dir() {
            copy_directory(&entry.path(), &target)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), &target)
                .map_err(|error| format!("failed to copy {}: {error}", entry.path().display()))?;
        } else {
            return Err(format!(
                "portable resources cannot contain links: {}",
                entry.path().display()
            ));
        }
    }
    Ok(())
}

fn remove_owned_path(path: &Path) -> std::io::Result<()> {
    if path.is_dir() {
        fs::remove_dir_all(path)
    } else if path.exists() {
        fs::remove_file(path)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "kkterm-portable-creator-{name}-{}-{}",
            std::process::id(),
            STAGING_COUNTER.fetch_add(1, Ordering::Relaxed)
        ))
    }

    #[test]
    fn destination_must_be_empty() {
        let root = temp_dir("non-empty");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("keep.txt"), "user data").unwrap();
        let error = prepare_destination(&root).unwrap_err();
        assert!(error.contains("must be empty"));
        assert_eq!(
            fs::read_to_string(root.join("keep.txt")).unwrap(),
            "user data"
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn directory_copy_preserves_nested_resources() {
        let root = temp_dir("copy");
        let source = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(source.join("nested")).unwrap();
        fs::write(source.join("nested").join("resource.md"), "portable").unwrap();
        copy_directory(&source, &destination).unwrap();
        assert_eq!(
            fs::read_to_string(destination.join("nested").join("resource.md")).unwrap(),
            "portable"
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn assembler_creates_a_launch_ready_portable_folder() {
        let root = temp_dir("assemble");
        let sources = root.join("sources");
        let destination = root.join("portable");
        fs::create_dir_all(sources.join("manual")).unwrap();
        fs::create_dir_all(sources.join("assistant-skills").join("sample")).unwrap();
        fs::create_dir_all(&destination).unwrap();
        fs::write(sources.join("kkterm.exe"), "exe").unwrap();
        fs::write(sources.join("kkterm-cli.exe"), "cli").unwrap();
        fs::write(sources.join("manual").join("INDEX.md"), "manual").unwrap();
        fs::write(
            sources
                .join("assistant-skills")
                .join("sample")
                .join("SKILL.md"),
            "skill",
        )
        .unwrap();
        let source_storage =
            Storage::open(root.join("source.sqlite3")).expect("source storage opens");

        assemble_portable_copy(
            &source_storage,
            PortableSources {
                executable: &sources.join("kkterm.exe"),
                cli: &sources.join("kkterm-cli.exe"),
                manual: &sources.join("manual"),
                assistant_skills: &sources.join("assistant-skills"),
            },
            &destination,
            vec!["settings".to_string()],
        )
        .expect("assemble portable copy");

        for relative in [
            "KKTerm.exe",
            "kkterm-cli.exe",
            "manual/INDEX.md",
            "assistant-skills/sample/SKILL.md",
            "data/kkterm.sqlite3",
            PORTABLE_MARKER_FILENAME,
        ] {
            assert!(destination.join(relative).is_file(), "missing {relative}");
        }
        let generated = Storage::open(destination.join("data").join("kkterm.sqlite3"))
            .expect("generated portable database reopens");
        assert!(fs::read_dir(&destination).unwrap().all(|entry| {
            !entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with(".kkterm-portable-create-")
        }));
        drop(generated);
        drop(source_storage);
        fs::remove_dir_all(root).unwrap();
    }
}
