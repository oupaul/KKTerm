// Dynamic WSL distribution management for the Install Helper.
//
// The catalog ships a small set of `wslDistro` recipes, but users want to see
// and manage *every* distro on the host — including ones installed outside
// KKTerm — set the default, remove any of them, and install from the live
// `wsl --list --online` set. That live, host-derived state does not fit the
// static catalog model, so it lives here behind dedicated commands instead.
//
// `wsl.exe` emits UTF-16LE on Windows and uses localized, fixed-width column
// headers. The parsers below decode the bytes and key off structural signals
// (the `*` default marker, the trailing version digit, the first table-gap row)
// rather than the localized header text, so they keep working under non-English
// Windows.

use serde::{Deserialize, Serialize};
use std::process::Command;

use super::proc::no_window;

/// One installed WSL distribution, as reported by `wsl --list --verbose`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WslDistroInfo {
    pub name: String,
    /// The distro marked `*` (the target of bare `wsl` / `wsl --install`).
    pub is_default: bool,
    /// WSL major version (1 or 2). `None` when the column was unparseable.
    pub version: Option<u8>,
    /// Best-effort running flag (English "Running"); cosmetic only.
    pub running: bool,
}

/// One installable distribution, as reported by `wsl --list --online`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WslOnlineDistro {
    /// The `--install --distribution <name>` identifier, e.g. `Ubuntu-24.04`.
    pub name: String,
    /// Human-readable label, e.g. `Ubuntu 24.04 LTS`. Falls back to `name`.
    pub friendly_name: String,
}

/// Decode raw `wsl.exe` stdout/stderr. WSL emits UTF-16LE on Windows (often
/// with a BOM); fall back to UTF-8 for the non-Windows test/dev path.
pub fn decode_wsl_output(bytes: &[u8]) -> String {
    if let Some(rest) = bytes.strip_prefix(&[0xFF, 0xFE]) {
        return decode_utf16le(rest);
    }
    // Heuristic: UTF-16LE ASCII text is half NUL bytes. Treat a high NUL
    // ratio as UTF-16LE even without a BOM.
    let nul_count = bytes.iter().filter(|byte| **byte == 0).count();
    if !bytes.is_empty() && nul_count * 2 >= bytes.len() {
        return decode_utf16le(bytes);
    }
    String::from_utf8_lossy(bytes).into_owned()
}

fn decode_utf16le(bytes: &[u8]) -> String {
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();
    String::from_utf16_lossy(&units)
}

/// Parse `wsl --list --verbose` output into structured rows. Distro names never
/// contain spaces, so each data row is `[* ]<name> <state> <version>`. The
/// header row is skipped naturally because its final column is not a digit.
pub fn parse_wsl_list_verbose(text: &str) -> Vec<WslDistroInfo> {
    let mut out = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let is_default = trimmed.starts_with('*');
        let rest = trimmed.trim_start_matches('*').trim();
        let tokens: Vec<&str> = rest.split_whitespace().collect();
        if tokens.len() < 3 {
            continue;
        }
        let version = tokens[tokens.len() - 1].parse::<u8>().ok();
        if version.is_none() {
            // Header row ("… VERSION") or any non-data line.
            continue;
        }
        let name = tokens[0].to_string();
        if name.is_empty() {
            continue;
        }
        let running = tokens[1].eq_ignore_ascii_case("running");
        out.push(WslDistroInfo {
            name,
            is_default,
            version,
            running,
        });
    }
    out
}

/// Parse `wsl --list --online` output. The single-spaced preamble sentences are
/// skipped; the first line containing a two-space column gap is the (localized)
/// header and is dropped; every later non-empty line is `name  friendly name`.
pub fn parse_wsl_list_online(text: &str) -> Vec<WslOnlineDistro> {
    let mut out = Vec::new();
    let mut seen_header = false;
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let has_table_gap = trimmed.contains("  ");
        if !seen_header {
            // The header is the first table-shaped row; preamble sentences use
            // single spaces only.
            if has_table_gap {
                seen_header = true;
            }
            continue;
        }
        let name = match trimmed.split_whitespace().next() {
            Some(token) => token.to_string(),
            None => continue,
        };
        // Defensive: an English header that slipped through is not a distro.
        if name.eq_ignore_ascii_case("NAME") {
            continue;
        }
        let friendly_name = trimmed[name.len()..].trim();
        let friendly_name = if friendly_name.is_empty() {
            name.clone()
        } else {
            friendly_name.to_string()
        };
        out.push(WslOnlineDistro {
            name,
            friendly_name,
        });
    }
    out
}

// ---- host commands -----------------------------------------------------

/// Run `wsl` and return its decoded stdout only when the exit code is success.
/// Used for state-changing commands where a non-zero exit is a real failure.
fn run_wsl(args: &[&str]) -> Result<String, String> {
    let output = no_window(&mut Command::new("wsl"))
        .args(args)
        .output()
        .map_err(|error| format!("failed to run wsl: {error}"))?;
    let stdout = decode_wsl_output(&output.stdout);
    if output.status.success() {
        return Ok(stdout);
    }
    let stderr = decode_wsl_output(&output.stderr);
    let detail = if stderr.trim().is_empty() {
        stdout.trim().to_string()
    } else {
        stderr.trim().to_string()
    };
    Err(if detail.is_empty() {
        "wsl command failed".to_string()
    } else {
        detail
    })
}

/// Run a `wsl --list` variant and return its decoded stdout regardless of exit
/// code. `wsl --list --verbose` exits non-zero when there are no installed
/// distros, which should surface as an empty list, not an error. Only a failure
/// to spawn `wsl` at all (e.g. WSL not present) is reported as an error.
fn run_wsl_list(args: &[&str]) -> Result<String, String> {
    let output = no_window(&mut Command::new("wsl"))
        .args(args)
        .output()
        .map_err(|error| format!("failed to run wsl: {error}"))?;
    Ok(decode_wsl_output(&output.stdout))
}

pub fn list_installed_distros() -> Result<Vec<WslDistroInfo>, String> {
    Ok(parse_wsl_list_verbose(&run_wsl_list(&[
        "--list",
        "--verbose",
    ])?))
}

pub fn list_online_distros() -> Result<Vec<WslOnlineDistro>, String> {
    Ok(parse_wsl_list_online(&run_wsl_list(&["--list", "--online"])?))
}

pub fn set_default_distro(distro: &str) -> Result<(), String> {
    validate_distro_name(distro)?;
    run_wsl(&["--set-default", distro]).map(|_| ())
}

pub fn unregister_distro(distro: &str) -> Result<(), String> {
    validate_distro_name(distro)?;
    run_wsl(&["--unregister", distro]).map(|_| ())
}

pub fn install_distro(distro: &str) -> Result<(), String> {
    validate_distro_name(distro)?;
    run_wsl(&["--install", "--distribution", distro, "--no-launch"]).map(|_| ())
}

/// Reject anything that is not a plain distro identifier so a caller-supplied
/// name can never smuggle extra `wsl` arguments into the spawned command.
fn validate_distro_name(distro: &str) -> Result<(), String> {
    let valid = !distro.is_empty()
        // A leading dash would be parsed by `wsl` as a flag, not a distro.
        && !distro.starts_with('-')
        && distro
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'));
    if valid {
        Ok(())
    } else {
        Err(format!("invalid WSL distribution name: {distro:?}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_utf16le_with_bom_round_trips_ascii() {
        let mut bytes = vec![0xFF, 0xFE];
        for unit in "Ubuntu".encode_utf16() {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        assert_eq!(decode_wsl_output(&bytes), "Ubuntu");
    }

    #[test]
    fn decode_utf16le_without_bom_via_nul_ratio() {
        let mut bytes = Vec::new();
        for unit in "Debian".encode_utf16() {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        assert_eq!(decode_wsl_output(&bytes), "Debian");
    }

    #[test]
    fn decode_plain_utf8_passthrough() {
        assert_eq!(decode_wsl_output(b"Ubuntu\n"), "Ubuntu\n");
    }

    #[test]
    fn parse_verbose_extracts_default_and_versions() {
        let text = "  NAME            STATE           VERSION\n\
                    * Ubuntu          Running         2\n\
                    \u{0020} Debian          Stopped         2\n\
                    \u{0020} kali-linux      Stopped         1\n";
        let distros = parse_wsl_list_verbose(text);
        assert_eq!(distros.len(), 3);
        assert_eq!(
            distros[0],
            WslDistroInfo {
                name: "Ubuntu".into(),
                is_default: true,
                version: Some(2),
                running: true,
            }
        );
        assert_eq!(distros[1].name, "Debian");
        assert!(!distros[1].is_default);
        assert!(!distros[1].running);
        assert_eq!(distros[2].version, Some(1));
    }

    #[test]
    fn parse_verbose_skips_header_even_when_only_rows() {
        let distros = parse_wsl_list_verbose("  NAME   STATE   VERSION\n");
        assert!(distros.is_empty());
    }

    #[test]
    fn parse_online_skips_preamble_and_header() {
        let text = "The following is a list of valid distributions that can be installed.\n\
                    Install using 'wsl.exe --install <Distro>'.\n\
                    \n\
                    NAME                   FRIENDLY NAME\n\
                    Ubuntu                 Ubuntu\n\
                    Debian                 Debian GNU/Linux\n\
                    kali-linux             Kali Linux Rolling\n\
                    openSUSE-Tumbleweed    openSUSE Tumbleweed\n";
        let online = parse_wsl_list_online(text);
        assert_eq!(online.len(), 4);
        assert_eq!(online[0].name, "Ubuntu");
        assert_eq!(online[0].friendly_name, "Ubuntu");
        assert_eq!(online[1].name, "Debian");
        assert_eq!(online[1].friendly_name, "Debian GNU/Linux");
        assert_eq!(online[3].name, "openSUSE-Tumbleweed");
        assert_eq!(online[3].friendly_name, "openSUSE Tumbleweed");
    }

    #[test]
    fn validate_distro_name_rejects_argument_injection() {
        assert!(validate_distro_name("Ubuntu-24.04").is_ok());
        assert!(validate_distro_name("kali-linux").is_ok());
        assert!(validate_distro_name("OracleLinux_9_1").is_ok());
        assert!(validate_distro_name("").is_err());
        assert!(validate_distro_name("--unregister").is_err());
        assert!(validate_distro_name("Ubuntu Debian").is_err());
        assert!(validate_distro_name("a/b").is_err());
    }
}
