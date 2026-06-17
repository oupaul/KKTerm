param(
    [switch]$Release
)

$ErrorActionPreference = "Stop"

# Repeatable SSH post-auth terminal-readiness measurement.
#
# Wraps the ignored Rust measurement test
# `measure_native_ssh_terminal_readiness_after_auth` (src-tauri/src/ssh.rs),
# which opens the native `russh` terminal path, starts timing only after
# verified connect/auth completes, asserts the `<= 150 ms` budget, and prints
# the measured duration without host output or secret values.
#
# Configure the measurement target through KKTERM_SSH_* environment variables
# before running (see docs/PERFORMANCE.md):
#   KKTERM_SSH_HOST              (required) trusted, non-ProxyJump host
#   KKTERM_SSH_USER              (defaults to USERNAME/USER)
#   KKTERM_SSH_PORT              (defaults to 22)
#   KKTERM_SSH_AUTH              agent | keyFile | password
#   KKTERM_SSH_KEY_PATH          (keyFile only)
#   KKTERM_SSH_PASSWORD          (password only; not printed)
#   KKTERM_SSH_KNOWN_HOSTS_PATH  (defaults to KKTerm's trusted known-hosts file)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$ManifestPath = Join-Path $RepoRoot "src-tauri/Cargo.toml"

if (-not $env:KKTERM_SSH_HOST -or [string]::IsNullOrWhiteSpace($env:KKTERM_SSH_HOST)) {
    throw "Set KKTERM_SSH_HOST (and the other KKTERM_SSH_* variables) before measuring. See docs/PERFORMANCE.md."
}

$cargoArgs = @(
    "test",
    "--manifest-path", $ManifestPath,
    "measure_native_ssh_terminal_readiness_after_auth"
)
if ($Release) {
    $cargoArgs += "--release"
}
# `--ignored` runs the gated measurement test; `--nocapture` prints the value.
$cargoArgs += @("--", "--ignored", "--nocapture")

& cargo @cargoArgs
exit $LASTEXITCODE
