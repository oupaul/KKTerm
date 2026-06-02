param(
    # Triple used to NAME the sidecar so Tauri's externalBin resolution finds it.
    [string]$TargetTriple = "x86_64-pc-windows-msvc",
    # Optional cargo --target. When set, the CLI is cross/explicitly compiled for
    # that triple and read from target/<triple>/release. When empty, the host
    # default build is used (target/release), preserving the original behavior.
    [string]$CargoTarget = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$TauriRoot = Join-Path $RepoRoot "src-tauri"
$BinariesDir = Join-Path $TauriRoot "binaries"
if ($CargoTarget) {
    $CliSource = Join-Path $TauriRoot "target\$CargoTarget\release\kkterm-cli.exe"
} else {
    $CliSource = Join-Path $TauriRoot "target\release\kkterm-cli.exe"
}
$CliTarget = Join-Path $BinariesDir "kkterm-cli-$TargetTriple.exe"

New-Item -ItemType Directory -Force -Path $BinariesDir | Out-Null

Push-Location $TauriRoot
try {
    if ($CargoTarget) {
        cargo build --release --bin kkterm-cli --target $CargoTarget
    } else {
        cargo build --release --bin kkterm-cli
    }
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
