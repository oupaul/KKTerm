param(
    [string]$TargetTriple = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$TauriRoot = Join-Path $RepoRoot "src-tauri"
$BinariesDir = Join-Path $TauriRoot "binaries"
$CliSource = Join-Path $TauriRoot "target\release\kkterm-cli.exe"
$CliTarget = Join-Path $BinariesDir "kkterm-cli-$TargetTriple.exe"

New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

Push-Location $TauriRoot
try {
    cargo build --release --bin kkterm-cli
    if ($LASTEXITCODE -ne 0) {
        throw "Building kkterm-cli failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path $CliSource)) {
    throw "kkterm-cli binary not found at $CliSource."
}

Copy-Item -LiteralPath $CliSource -Destination $CliTarget -Force

[PSCustomObject]@{
    Sidecar = $CliTarget
    Source = $CliSource
}
