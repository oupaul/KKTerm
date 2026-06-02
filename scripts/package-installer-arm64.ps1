#requires -Version 5.1
<#
.SYNOPSIS
    Detects (and optionally installs) the toolchain required to build KKTerm for
    Windows on Arm (ARM64), then produces a native ARM64 NSIS installer.

.DESCRIPTION
    This mirrors scripts/package-installer.ps1 but targets the
    aarch64-pc-windows-msvc triple. It can run on either an ARM64 host (native
    build) or an x64 host (cross build), as long as the ARM64 MSVC toolchain and
    the aarch64 Rust target are available.

    Toolchain pieces that are checked:
      - Rust (rustup/cargo) + the aarch64-pc-windows-msvc target
      - Node.js + npm (frontend build via beforeBuildCommand)
      - MSVC C++ ARM64 build tools (Visual Studio Build Tools component
        Microsoft.VisualStudio.Component.VC.Tools.ARM64)
      - CMake and NASM, required to compile aws-lc-sys (pulled in by rustls via
        reqwest/lettre) for the ARM64 target

    With -InstallMissing the script uses winget to download and install the
    pieces it can (Rust target, CMake, NASM, and the VS ARM64 build-tools
    component). The MSVC component install is best-effort and may require an
    elevated/interactive Visual Studio Installer run.

.PARAMETER OutputDir
    Directory (relative to the repo root) the installer + checksum are copied to.

.PARAMETER InstallMissing
    Attempt to download/install missing toolchain pieces via winget.

.PARAMETER SkipToolchainCheck
    Skip toolchain detection entirely and go straight to the build.

.PARAMETER ToolchainOnly
    Only run toolchain detection/installation; do not build the installer.
#>
param(
    [string]$OutputDir = "artifacts",
    [switch]$InstallMissing,
    [switch]$SkipToolchainCheck,
    [switch]$ToolchainOnly
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$PackageJsonPath = Join-Path $RepoRoot "package.json"
$Package = Get-Content -Raw $PackageJsonPath | ConvertFrom-Json
$Version = $Package.version

$CargoTarget = "aarch64-pc-windows-msvc"
$TargetTriple = "windows-arm64"
$OutputName = "kkterm-$Version-$TargetTriple-setup.exe"
$ResolvedOutputDir = Join-Path $RepoRoot $OutputDir
$InstallerOutputPath = Join-Path $ResolvedOutputDir $OutputName
$ChecksumPath = "$InstallerOutputPath.sha256"
$BundleDir = Join-Path $RepoRoot "src-tauri\target\$CargoTarget\release\bundle\nsis"

function Assert-ChildPath {
    param(
        [string]$Parent,
        [string]$Child
    )

    $ResolvedParent = [System.IO.Path]::GetFullPath($Parent)
    $ResolvedChild = [System.IO.Path]::GetFullPath($Child)
    if (-not $ResolvedChild.StartsWith($ResolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify path outside $ResolvedParent`: $ResolvedChild"
    }
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Winget {
    param([string]$Id)

    if (-not (Test-CommandExists "winget")) {
        Write-Warning "winget is not available; cannot auto-install '$Id'. Install it manually."
        return $false
    }
    Write-Host "Installing '$Id' via winget..."
    winget install --id $Id --exact --accept-source-agreements --accept-package-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "winget install for '$Id' exited with code $LASTEXITCODE."
        return $false
    }
    return $true
}

function Find-VsArm64BuildTools {
    # Returns $true when the MSVC C++ ARM64 build tools component is present.
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) {
        return $null # unknown – vswhere not installed
    }
    $found = & $vswhere -products * -latest -requires Microsoft.VisualStudio.Component.VC.Tools.ARM64 -property installationPath 2>$null
    return [bool]$found
}

function Invoke-ToolchainCheck {
    $missing = @()

    # --- Rust ---------------------------------------------------------------
    if (-not (Test-CommandExists "cargo") -or -not (Test-CommandExists "rustup")) {
        Write-Warning "Rust (rustup/cargo) not found."
        if ($InstallMissing) { Invoke-Winget "Rustlang.Rustup" | Out-Null }
        if (-not (Test-CommandExists "rustup")) { $missing += "rustup/cargo" }
    }

    if (Test-CommandExists "rustup") {
        $installedTargets = & rustup target list --installed 2>$null
        if ($installedTargets -notcontains $CargoTarget) {
            Write-Warning "Rust target '$CargoTarget' is not installed."
            if ($InstallMissing) {
                rustup target add $CargoTarget
                if ($LASTEXITCODE -ne 0) { $missing += "rust target $CargoTarget" }
            } else {
                $missing += "rust target $CargoTarget (run: rustup target add $CargoTarget)"
            }
        } else {
            Write-Host "OK: rust target $CargoTarget"
        }
    }

    # --- Node / npm ---------------------------------------------------------
    if (-not (Test-CommandExists "node") -or -not (Test-CommandExists "npm")) {
        Write-Warning "Node.js/npm not found (needed for the frontend build)."
        if ($InstallMissing) { Invoke-Winget "OpenJS.NodeJS.LTS" | Out-Null }
        if (-not (Test-CommandExists "npm")) { $missing += "node/npm" }
    } else {
        Write-Host "OK: node/npm"
    }

    # --- CMake (aws-lc-sys) -------------------------------------------------
    if (-not (Test-CommandExists "cmake")) {
        Write-Warning "CMake not found (required to build aws-lc-sys / rustls for ARM64)."
        if ($InstallMissing) { Invoke-Winget "Kitware.CMake" | Out-Null }
        if (-not (Test-CommandExists "cmake")) { $missing += "cmake" }
    } else {
        Write-Host "OK: cmake"
    }

    # --- NASM (aws-lc-sys) --------------------------------------------------
    if (-not (Test-CommandExists "nasm")) {
        Write-Warning "NASM not found (required by aws-lc-sys assembly build)."
        if ($InstallMissing) { Invoke-Winget "NASM.NASM" | Out-Null }
        if (-not (Test-CommandExists "nasm")) {
            $missing += "nasm (ensure it is on PATH after install)"
        }
    } else {
        Write-Host "OK: nasm"
    }

    # --- MSVC ARM64 build tools --------------------------------------------
    $vsArm64 = Find-VsArm64BuildTools
    if ($vsArm64 -eq $true) {
        Write-Host "OK: MSVC C++ ARM64 build tools"
    } elseif ($vsArm64 -eq $false) {
        Write-Warning "MSVC C++ ARM64 build tools component not detected."
        if ($InstallMissing) {
            # Best-effort: add the ARM64 component to VS Build Tools.
            Invoke-Winget "Microsoft.VisualStudio.2022.BuildTools" | Out-Null
            Write-Warning ("If the ARM64 component is still missing, run the Visual Studio Installer and add " +
                "'MSVC v143 - VS 2022 C++ ARM64 build tools'.")
        }
        $missing += "MSVC C++ ARM64 build tools (VS component Microsoft.VisualStudio.Component.VC.Tools.ARM64)"
    } else {
        Write-Warning "Could not detect Visual Studio via vswhere; ensure the MSVC ARM64 C++ build tools are installed."
    }

    if ($missing.Count -gt 0) {
        throw ("Missing ARM64 build toolchain pieces:`n  - " + ($missing -join "`n  - ") +
            "`nRe-run with -InstallMissing to attempt automatic installation, or install them manually.")
    }

    Write-Host "Toolchain check passed for $CargoTarget."
}

Push-Location $RepoRoot
try {
    if (-not $SkipToolchainCheck) {
        Invoke-ToolchainCheck
    }

    if ($ToolchainOnly) {
        Write-Host "Toolchain-only run requested; skipping build."
        return
    }

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-tauri-sidecars.ps1 `
        -TargetTriple $CargoTarget -CargoTarget $CargoTarget
    if ($LASTEXITCODE -ne 0) {
        throw "Preparing the ARM64 sidecar failed with exit code $LASTEXITCODE."
    }

    $PreviousTauriConfig = $env:TAURI_CONFIG
    $env:TAURI_CONFIG = '{"bundle":{"externalBin":["binaries/kkterm-cli"]}}'
    try {
        npm exec tauri -- build --bundles=nsis --target $CargoTarget
    }
    finally {
        $env:TAURI_CONFIG = $PreviousTauriConfig
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path $BundleDir)) {
    throw "NSIS bundle directory not found at $BundleDir."
}

$BuiltInstaller = Get-ChildItem -Path $BundleDir -Filter "*.exe" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $BuiltInstaller) {
    throw "No NSIS installer executable found in $BundleDir."
}

New-Item -ItemType Directory -Force -Path $ResolvedOutputDir | Out-Null

Assert-ChildPath -Parent $ResolvedOutputDir -Child $InstallerOutputPath
if (Test-Path $InstallerOutputPath) {
    Remove-Item -LiteralPath $InstallerOutputPath -Force
}
if (Test-Path $ChecksumPath) {
    Remove-Item -LiteralPath $ChecksumPath -Force
}

Copy-Item -LiteralPath $BuiltInstaller.FullName -Destination $InstallerOutputPath

$HashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash(
    [System.IO.File]::ReadAllBytes($InstallerOutputPath)
)
$Hash = -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
"$Hash  $([System.IO.Path]::GetFileName($InstallerOutputPath))" |
    Set-Content -Path $ChecksumPath -Encoding ASCII

[PSCustomObject]@{
    Installer = $InstallerOutputPath
    Sha256 = $ChecksumPath
    Target = $CargoTarget
    SourceInstaller = $BuiltInstaller.FullName
}
