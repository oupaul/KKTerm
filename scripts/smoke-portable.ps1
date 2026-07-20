#requires -Version 5.1
param(
    [string]$Artifact = "",
    [int]$ReadyTimeoutSeconds = 45
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir ".."))
$Package = Get-Content -Raw (Join-Path $RepoRoot "package.json") | ConvertFrom-Json
if (-not $Artifact) {
    $Artifact = Join-Path $RepoRoot "artifacts\kkterm-$($Package.version)-windows-x64-portable.zip"
}
$Artifact = [System.IO.Path]::GetFullPath($Artifact)
$ChecksumPath = "$Artifact.sha256"
$SmokeRoot = Join-Path ([System.IO.Path]::GetTempPath()) "kkterm-portable-smoke-$([guid]::NewGuid().ToString('N'))"

function Get-DirectorySnapshot {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return "<missing>"
    }
    $Root = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    return (@(Get-ChildItem -LiteralPath $Root -Force -Recurse -ErrorAction Stop | ForEach-Object {
        $Relative = $_.FullName.Substring($Root.Length).TrimStart('\')
        "$Relative|$($_.PSIsContainer)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)"
    } | Sort-Object) -join "`n")
}

function Get-RegistrySnapshot {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return "<missing>"
    }
    $Item = Get-ItemProperty -LiteralPath $Path
    return (@($Item.PSObject.Properties |
        Where-Object { $_.Name -notmatch '^PS(Path|ParentPath|ChildName|Drive|Provider)$' } |
        ForEach-Object { "$($_.Name)=$($_.Value)" } | Sort-Object) -join "`n")
}

if (-not (Test-Path -LiteralPath $Artifact)) {
    throw "Portable artifact not found: $Artifact"
}
if (-not (Test-Path -LiteralPath $ChecksumPath)) {
    throw "Portable checksum not found: $ChecksumPath"
}
$ExpectedHash = ((Get-Content -Raw -LiteralPath $ChecksumPath).Trim() -split '\s+')[0]
$HashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash(
    [System.IO.File]::ReadAllBytes($Artifact)
)
$ActualHash = -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
if ($ExpectedHash -ne $ActualHash) {
    throw "Portable artifact checksum mismatch."
}

$SyntheticAppData = Join-Path $SmokeRoot "host-profile\AppData\Roaming"
$SyntheticLocalAppData = Join-Path $SmokeRoot "host-profile\AppData\Local"
New-Item -ItemType Directory -Force -Path $SyntheticAppData, $SyntheticLocalAppData | Out-Null
$InstalledPaths = @(
    (Join-Path $SyntheticAppData "com.kkterm.app"),
    (Join-Path $SyntheticLocalAppData "com.kkterm.app"),
    (Join-Path $SyntheticLocalAppData "KKTerm\Logs")
)
$RegistryPaths = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\Software\KKTerm"
)
$BeforeDirectories = @{}
foreach ($Path in $InstalledPaths) { $BeforeDirectories[$Path] = Get-DirectorySnapshot $Path }
$BeforeRegistry = @{}
foreach ($Path in $RegistryPaths) { $BeforeRegistry[$Path] = Get-RegistrySnapshot $Path }

$PreviousSmokeValue = $env:KKTERM_PORTABLE_SMOKE_TEST
$PreviousAppData = $env:APPDATA
$PreviousLocalAppData = $env:LOCALAPPDATA
try {
    Expand-Archive -LiteralPath $Artifact -DestinationPath $SmokeRoot

    foreach ($Required in @(
        "KKTerm.exe",
        "kkterm-cli.exe",
        "kkterm-portable.marker",
        "manual\INDEX.md",
        "assistant-skills\terminal-command-planner\SKILL.md"
    )) {
        if (-not (Test-Path -LiteralPath (Join-Path $SmokeRoot $Required))) {
            throw "Portable archive entry is missing: $Required"
        }
    }
    if (Test-Path -LiteralPath (Join-Path $SmokeRoot "data")) {
        throw "Portable archive unexpectedly contains user data."
    }

    $env:KKTERM_PORTABLE_SMOKE_TEST = "1"
    $env:APPDATA = $SyntheticAppData
    $env:LOCALAPPDATA = $SyntheticLocalAppData
    $Executable = Join-Path $SmokeRoot "KKTerm.exe"
    $Primary = Start-Process -FilePath $Executable -WorkingDirectory $SmokeRoot -PassThru
    $ReadyPath = Join-Path $SmokeRoot "data\portable-smoke-ready"
    $Deadline = (Get-Date).AddSeconds($ReadyTimeoutSeconds)
    while (-not (Test-Path -LiteralPath $ReadyPath)) {
        if ($Primary.HasExited) {
            throw "Portable KKTerm exited before completing its runtime smoke check."
        }
        if ((Get-Date) -ge $Deadline) {
            throw "Portable KKTerm did not become ready within $ReadyTimeoutSeconds seconds."
        }
        Start-Sleep -Milliseconds 250
        $Primary.Refresh()
    }

    $Secondary = Start-Process -FilePath $Executable -WorkingDirectory $SmokeRoot -PassThru
    if (-not $Secondary.WaitForExit(10000)) {
        throw "A second portable instance using the same data root did not exit."
    }
    $Primary.Refresh()
    if ($Primary.HasExited) {
        throw "The primary portable instance exited while the second instance was tested."
    }
    if (-not $Primary.WaitForExit(30000)) {
        throw "Portable runtime smoke process did not exit cleanly."
    }
    if ($Primary.ExitCode -ne 0) {
        throw "Portable runtime smoke process exited with code $($Primary.ExitCode)."
    }

    foreach ($RequiredData in @("kkterm.sqlite3", "webview", "logs")) {
        if (-not (Test-Path -LiteralPath (Join-Path $SmokeRoot "data\$RequiredData"))) {
            throw "Portable runtime data was not created beside the executable: $RequiredData"
        }
    }
    $WalPath = Join-Path $SmokeRoot "data\kkterm.sqlite3-wal"
    if ((Test-Path -LiteralPath $WalPath) -and (Get-Item -LiteralPath $WalPath).Length -gt 0) {
        throw "Portable SQLite WAL was not checkpointed on clean exit."
    }

    foreach ($Path in $InstalledPaths) {
        if ((Get-DirectorySnapshot $Path) -ne $BeforeDirectories[$Path]) {
            throw "Portable startup changed installed-mode storage: $Path"
        }
    }
    foreach ($Path in $RegistryPaths) {
        if ((Get-RegistrySnapshot $Path) -ne $BeforeRegistry[$Path]) {
            throw "Portable startup changed registry state: $Path"
        }
    }

    [pscustomobject]@{
        Artifact = $Artifact
        RuntimeResources = "ok"
        SameRootSingleInstance = "ok"
        InstalledStorageIsolation = "ok"
        RegistryIsolation = "ok"
        CleanDatabaseExit = "ok"
    }
}
finally {
    $env:KKTERM_PORTABLE_SMOKE_TEST = $PreviousSmokeValue
    $env:APPDATA = $PreviousAppData
    $env:LOCALAPPDATA = $PreviousLocalAppData
    if (Get-Variable Primary -ErrorAction SilentlyContinue) {
        $Primary.Refresh()
        if (-not $Primary.HasExited) { Stop-Process -Id $Primary.Id -Force -ErrorAction SilentlyContinue }
    }
    if (Get-Variable Secondary -ErrorAction SilentlyContinue) {
        $Secondary.Refresh()
        if (-not $Secondary.HasExited) { Stop-Process -Id $Secondary.Id -Force -ErrorAction SilentlyContinue }
    }
    $ResolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $ResolvedSmoke = [System.IO.Path]::GetFullPath($SmokeRoot)
    if ($ResolvedSmoke.StartsWith($ResolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $ResolvedSmoke)) {
        $DeleteError = $null
        for ($Attempt = 0; $Attempt -lt 20; $Attempt += 1) {
            try {
                [System.IO.Directory]::Delete($ResolvedSmoke, $true)
                $DeleteError = $null
                break
            }
            catch [System.IO.IOException] {
                $DeleteError = $_
                Start-Sleep -Milliseconds 500
            }
        }
        if ($DeleteError) {
            throw $DeleteError
        }
    }
}
