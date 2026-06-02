param(
    [string]$OutputDir = "artifacts",
    [string]$Remote = "origin",
    [string]$Branch = "main",
    [switch]$Draft,
    [switch]$Prerelease,
    [switch]$DryRun,
    [switch]$SkipBuild,
    [switch]$SkipSmoke,
    [switch]$SkipAiReleaseNotes,
    [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseScript = Join-Path $ScriptDir "release-github.ps1"
$ForwardParams = @{
    OutputDir = $OutputDir
    Remote = $Remote
    Branch = $Branch
    IncludeArm64 = $true
}

if ($Draft) {
    $ForwardParams["Draft"] = $true
}
if ($Prerelease) {
    $ForwardParams["Prerelease"] = $true
}
if ($DryRun) {
    $ForwardParams["DryRun"] = $true
}
if ($SkipBuild) {
    $ForwardParams["SkipBuild"] = $true
}
if ($SkipSmoke) {
    $ForwardParams["SkipSmoke"] = $true
}
if ($SkipAiReleaseNotes) {
    $ForwardParams["SkipAiReleaseNotes"] = $true
}
if ($AllowDirty) {
    $ForwardParams["AllowDirty"] = $true
}

& $ReleaseScript @ForwardParams
