# Sign the Installer Helper catalog with the maintainer Ed25519 key.
#
# Prereqs: install minisign (`winget install jedisct1.minisign`).
#
# First-time setup:
#   minisign -G -p installer-pubkey.minisign -s installer-seckey.minisign
#
# Then paste the contents of installer-pubkey.minisign (single base64 line
# after the "RWQ" prefix) into INSTALLER_CATALOG_PUBKEY in
# src-tauri/src/installer/trust.rs and ship a KKTerm release. Keep
# installer-seckey.minisign offline — never commit it.
#
# Routine catalog updates (run from repo root):
#   .\scripts\installer\sign-catalog.ps1 -SecretKey C:\path\to\installer-seckey.minisign
#
# This:
#   1. Validates the JSON by parsing it.
#   2. Signs `installer/catalog.v1.json` -> `installer/catalog.v1.json.minisig`
#   3. Prints a reminder to commit both files together.

param(
  [Parameter(Mandatory = $true)]
  [string]$SecretKey,
  [string]$Catalog = "installer/catalog.v1.json"
)

if (-not (Test-Path $Catalog)) {
  Write-Error "Catalog file not found: $Catalog"
  exit 1
}

if (-not (Test-Path $SecretKey)) {
  Write-Error "Secret key file not found: $SecretKey"
  exit 1
}

# Validate JSON before signing.
try {
  $null = Get-Content $Catalog -Raw | ConvertFrom-Json
} catch {
  Write-Error "Catalog JSON is malformed: $_"
  exit 1
}

# Sign. minisign writes `<Catalog>.minisig` next to the input file.
& minisign -S -s $SecretKey -m $Catalog
if ($LASTEXITCODE -ne 0) {
  Write-Error "minisign returned $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Signed: $Catalog -> $Catalog.minisig"
Write-Host "Commit both files together:"
Write-Host "  git add $Catalog $Catalog.minisig"
Write-Host "  git commit -m 'installer: catalog update'"
Write-Host ""
Write-Host "The published URL is:"
Write-Host "  https://raw.githubusercontent.com/ryantsai/KKTerm/main/$Catalog"
Write-Host "  https://raw.githubusercontent.com/ryantsai/KKTerm/main/$Catalog.minisig"
