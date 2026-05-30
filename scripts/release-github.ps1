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
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$PackageJsonPath = Join-Path $RepoRoot "package.json"
$PackageLockPath = Join-Path $RepoRoot "package-lock.json"
$TauriConfigPath = Join-Path $RepoRoot "src-tauri\tauri.conf.json"
$CargoTomlPath = Join-Path $RepoRoot "src-tauri\Cargo.toml"
$ChangelogPath = Join-Path $RepoRoot "CHANGELOG.md"
$ResolvedOutputDir = Join-Path $RepoRoot $OutputDir

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$Action
    )

    Write-Host "==> $Action"
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$Action failed with exit code $LASTEXITCODE."
    }
}

function Invoke-NativeCapture {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList
    )

    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $Output = & $FilePath @ArgumentList 2>&1
        return [pscustomobject]@{
            Output = $Output
            ExitCode = $LASTEXITCODE
        }
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }
}

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $Name"
    }
}

function Assert-Version {
    param([string]$Version)

    if ($Version -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
        throw "Expected version to be <major>.<minor>.<build>, found '$Version'."
    }
}

function Set-TextFileUtf8NoBom {
    param(
        [string]$Path,
        [string]$Value
    )

    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Value, $Utf8NoBom)
}

function Test-GitHubReleaseExists {
    param([string]$TagName)

    $PreviousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        gh release view $TagName *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }
}

function Set-CargoPackageVersion {
    param(
        [string]$Path,
        [string]$Version
    )

    $Content = Get-Content -Raw $Path
    $Updated = [regex]::Replace(
        $Content,
        '(?m)^version = "\d+\.\d+\.\d+"',
        "version = `"$Version`"",
        1
    )

    if ($Updated -eq $Content) {
        throw "Unable to update package version in $Path."
    }

    Set-TextFileUtf8NoBom -Path $Path -Value $Updated
}

function Set-TauriConfigVersion {
    param(
        [string]$Path,
        [string]$Version
    )

    Write-Host "==> Update Tauri version"
    $Config = Get-Content -Raw $Path | ConvertFrom-Json
    $Config.version = $Version
    $Updated = $Config | ConvertTo-Json -Depth 10
    Set-TextFileUtf8NoBom -Path $Path -Value ($Updated + [Environment]::NewLine)
}

Push-Location $RepoRoot
try {
    Assert-Command "git"
    Assert-Command "gh"
    Assert-Command "npm"
    Assert-Command "node"
    Assert-Command "cargo"

    $CurrentVersion = (& node -p "require('./package.json').version").Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read package.json version."
    }
    Assert-Version $CurrentVersion

    $VersionParts = $CurrentVersion.Split(".") | ForEach-Object { [int]$_ }
    $NextVersion = "$($VersionParts[0]).$($VersionParts[1]).$($VersionParts[2] + 1)"
    $TagName = "v$NextVersion"
    $TargetTriple = "windows-x64"
    $InstallerExe = Join-Path $ResolvedOutputDir "kkterm-$NextVersion-$TargetTriple-setup.exe"
    $InstallerSha = "$InstallerExe.sha256"
    $ReleaseNotesPath = Join-Path $ResolvedOutputDir "release-notes-$TagName.md"
    $VersionReleaseNotesPath = Join-Path $RepoRoot "docs\releases\$TagName.md"
    # TODO(updates): Restore updater signature and latest.json release assets
    # when the update mechanism is re-enabled.
    # $InstallerSig = "$InstallerExe.sig"
    # $LatestJson = Join-Path $ResolvedOutputDir "latest.json"
    $ReleaseAssets = @($InstallerExe, $InstallerSha)

    Write-Host "Current version: $CurrentVersion"
    Write-Host "Next version:    $NextVersion"
    Write-Host "Release tag:     $TagName"

    if ($DryRun) {
        Write-Host "Dry run only; no files, git refs, builds, or GitHub releases will be changed."
        return
    }

    $Status = git status --porcelain
    if ($Status -and -not $AllowDirty) {
        throw "Working tree has uncommitted changes. Commit/stash them first, or rerun with -AllowDirty."
    }

    git fetch $Remote --tags
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to fetch tags from $Remote."
    }

    $ExistingTag = git tag --list $TagName
    if ($ExistingTag) {
        throw "Tag already exists locally: $TagName"
    }

    if (Test-GitHubReleaseExists -TagName $TagName) {
        throw "GitHub release already exists: $TagName"
    }

    $PreviousTag = (git tag --list "v*" --sort=-v:refname | Select-Object -First 1)
    if (-not $PreviousTag) {
        Write-Warning "No previous v* tag found; release notes will use recent commits."
    } else {
        Write-Host "Previous tag:    $PreviousTag"
    }

    $ReleaseNotesArgs = @(
        "scripts/generate-release-notes.mjs",
        "--version",
        $TagName,
        "--target",
        "HEAD",
        "--output",
        $ReleaseNotesPath,
        "--release-file",
        $VersionReleaseNotesPath,
        "--changelog",
        $ChangelogPath,
        "--model",
        "gpt-5.4-nano"
    )
    if ($PreviousTag) {
        $ReleaseNotesArgs += @("--previous-tag", $PreviousTag)
    }
    if ($SkipAiReleaseNotes) {
        $ReleaseNotesArgs += "--skip-ai"
    }

    Invoke-Checked -FilePath "node" -ArgumentList $ReleaseNotesArgs -Action "Generate release notes"

    Invoke-Checked -FilePath "npm" -ArgumentList @("version", $NextVersion, "--no-git-tag-version", "--allow-same-version") -Action "Update npm package version"
    Set-TauriConfigVersion -Path $TauriConfigPath -Version $NextVersion
    Set-CargoPackageVersion -Path $CargoTomlPath -Version $NextVersion

    if (-not $SkipBuild) {
        Invoke-Checked -FilePath "npm" -ArgumentList @("run", "package:installer") -Action "Build installer package"
    }

    # TODO(updates): Restore latest.json generation when the Tauri updater is
    # re-enabled.
    # if (-not (Test-Path $InstallerSig)) {
    #     throw "Updater signature not found: $InstallerSig"
    # }
    #
    # $Signature = (Get-Content -Raw $InstallerSig).Trim()
    # $DownloadUrl = "https://github.com/ryantsai/KKTerm/releases/download/$TagName/$([System.IO.Path]::GetFileName($InstallerExe))"
    # $LatestMetadata = [ordered]@{
    #     version = $NextVersion
    #     notes = "KKTerm $TagName Windows release."
    #     pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    #     platforms = [ordered]@{
    #         "windows-x86_64" = [ordered]@{
    #             signature = $Signature
    #             url = $DownloadUrl
    #         }
    #     }
    # }
    # $LatestMetadata |
    #     ConvertTo-Json -Depth 5 |
    #     Set-Content -Path $LatestJson -Encoding UTF8

    foreach ($Asset in $ReleaseAssets) {
        if (-not (Test-Path $Asset)) {
            throw "Release asset not found: $Asset"
        }
    }

    if (-not $SkipSmoke) {
        Invoke-Checked -FilePath "npm" -ArgumentList @("run", "smoke:installer") -Action "Smoke test installer"
    }

    Invoke-Checked -FilePath "npm" -ArgumentList @("run", "check") -Action "Frontend type check"
    Invoke-Checked -FilePath "cargo" -ArgumentList @("check", "--manifest-path", "src-tauri/Cargo.toml") -Action "Rust check"
    Invoke-Checked -FilePath "cargo" -ArgumentList @("test", "--manifest-path", "src-tauri/Cargo.toml") -Action "Rust tests"

    $AddResult = Invoke-NativeCapture -FilePath "git" -ArgumentList @("add", "package.json", "package-lock.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock", "CHANGELOG.md", $VersionReleaseNotesPath)
    if ($AddResult.ExitCode -ne 0) {
        throw "Unable to stage version files:`n$($AddResult.Output -join "`n")"
    }

    $StagedDiff = git diff --cached --name-only
    if (-not $StagedDiff) {
        throw "No staged release changes to commit. Files may already be at $NextVersion from a prior run; reset the version files and generated release notes, then rerun."
    }

    $CommitResult = Invoke-NativeCapture -FilePath "git" -ArgumentList @("commit", "-m", "chore: release $TagName")
    if ($CommitResult.ExitCode -ne 0) {
        throw "Unable to commit release version bump (exit $($CommitResult.ExitCode)):`n$($CommitResult.Output -join "`n")"
    }

    $TagResult = Invoke-NativeCapture -FilePath "git" -ArgumentList @("tag", "-a", $TagName, "-m", "KKTerm $TagName")
    if ($TagResult.ExitCode -ne 0) {
        throw "Unable to create git tag $TagName (exit $($TagResult.ExitCode)):`n$($TagResult.Output -join "`n")"
    }

    Invoke-Checked -FilePath "git" -ArgumentList @("push", $Remote, "HEAD:$Branch") -Action "Push release commit"
    Invoke-Checked -FilePath "git" -ArgumentList @("push", $Remote, $TagName) -Action "Push release tag"

    # Optional VirusTotal pre-publish scan. Gated by VT_API_KEY presence so local
    # release runs don't require an API key.
    if ($env:VT_API_KEY) {
        Write-Host "Submitting installer to VirusTotal..." -ForegroundColor Cyan
        try {
            $vtUrl = "https://www.virustotal.com/api/v3/files"
            $form = @{ file = Get-Item -Path $InstallerExe }
            $headers = @{ "x-apikey" = $env:VT_API_KEY }
            $response = Invoke-RestMethod -Uri $vtUrl -Method Post -Headers $headers -Form $form
            $analysisId = $response.data.id
            Write-Host "VT analysis id: $analysisId"
            # Poll the analysis (up to 3 minutes)
            $analysisUrl = "https://www.virustotal.com/api/v3/analyses/$analysisId"
            $maxWait = 180
            $waited = 0
            while ($waited -lt $maxWait) {
                Start-Sleep -Seconds 10
                $waited += 10
                $r = Invoke-RestMethod -Uri $analysisUrl -Headers $headers
                if ($r.data.attributes.status -eq "completed") {
                    $stats = $r.data.attributes.stats
                    Write-Host ("VT stats: malicious={0} suspicious={1} undetected={2}" -f $stats.malicious, $stats.suspicious, $stats.undetected)
                    if ($stats.malicious -gt 2) {
                        Write-Error "VirusTotal flagged $($stats.malicious) malicious engines. Release aborted."
                        exit 1
                    }
                    break
                }
            }
            if ($waited -ge $maxWait) {
                Write-Warning "VirusTotal analysis did not complete in $maxWait seconds. Proceeding without gate."
            }
        } catch {
            Write-Warning "VirusTotal submission failed: $_. Proceeding without gate."
        }
    } else {
        Write-Host "VT_API_KEY not set; skipping VirusTotal pre-publish scan." -ForegroundColor DarkGray
    }

    $GhArgs = @(
        "release",
        "create",
        $TagName,
        $InstallerExe,
        $InstallerSha,
        "--title",
        "KKTerm $TagName",
        "--notes-file",
        $ReleaseNotesPath
    )

    if ($Draft) {
        $GhArgs += "--draft"
    }
    if ($Prerelease) {
        $GhArgs += "--prerelease"
    }

    Invoke-Checked -FilePath "gh" -ArgumentList $GhArgs -Action "Create GitHub release"

    [PSCustomObject]@{
        Version = $NextVersion
        Tag = $TagName
        Draft = [bool]$Draft
        Prerelease = [bool]$Prerelease
        Assets = $ReleaseAssets
        ReleaseNotes = $ReleaseNotesPath
    }
}
finally {
    Pop-Location
}
