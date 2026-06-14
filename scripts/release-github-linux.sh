#!/usr/bin/env bash
set -euo pipefail

# Build and upload the Linux AppImage to an EXISTING GitHub Release without
# changing the project version or creating a new tag. Mirrors the macOS helper
# (scripts/release-github-macos.sh) but simplified for Linux:
#   * AppImage-only (no installer, no DMG).
#   * No notarization, no updater bundle, no latest.json (Linux v1 self-update
#     is manual download — see docs/LINUX_PORT.md).
#   * No version bump and no tag creation: the Windows release flow owns
#     versioning and creates the GitHub Release; this only attaches the Linux
#     asset to that existing release.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="artifacts"
TAG_NAME=""
TARGET_TRIPLE="${LINUX_TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
SKIP_BUILD=0
SKIP_NOTES_PATCH=0
ALLOW_DIRTY=0
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage: scripts/release-github-linux.sh [options]

Build and upload the Linux AppImage to an existing GitHub Release without
changing the project version or creating a new tag.

Options:
  -t, --tag <vX.Y.Z>       Existing release tag. Defaults to the AppImage version.
  -o, --output-dir <dir>   Artifact output directory. Default: artifacts.
      --skip-build         Upload an already-built AppImage from the bundle dir.
      --skip-notes-patch   Upload assets without updating the GitHub Release body.
      --allow-dirty        Do not require a clean working tree.
      --dry-run            Print actions without building or uploading.
  -h, --help               Show this help.
USAGE
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '==> %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found on PATH: $1"
}

read_package_version() {
  node -p "require('./package.json').version"
}

assert_version() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Expected version <major>.<minor>.<build>, found '$1'."
}

assert_tag_matches_version() {
  [[ "$1" == "v$2" ]] || die "Tag $1 does not match AppImage version $2."
}

detect_appimage_version() {
  local name="${1##*/}"
  if [[ "$name" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  die "Unable to detect version from AppImage filename: $name"
}

assert_clean_worktree() {
  [[ -z "$(git status --porcelain)" ]] || die "Working tree has uncommitted changes. Commit/stash them first, or rerun with --allow-dirty."
}

find_latest_appimage() {
  local dir="$REPO_ROOT/src-tauri/target/$TARGET_TRIPLE/release/bundle/appimage"
  [[ -d "$dir" ]] || die "AppImage output directory not found: $dir"
  local latest="" appimage nullglob_state
  nullglob_state="$(shopt -p nullglob)"
  shopt -s nullglob
  for appimage in "$dir"/*.AppImage; do
    if [[ -z "$latest" || "$appimage" -nt "$latest" ]]; then
      latest="$appimage"
    fi
  done
  eval "$nullglob_state"
  [[ -n "$latest" ]] || die "No AppImage found in $dir"
  printf '%s' "$latest"
}

patch_release_notes() {
  local tag="$1" repo="$2" appimage_name="$3"
  local current temp_file
  current="$(gh release view "$tag" --json body --jq .body)"
  temp_file="$(mktemp)"

  NOTES_BODY="$current" \
  RELEASE_TAG="$tag" \
  RELEASE_REPO="$repo" \
  APPIMAGE_NAME="$appimage_name" \
    node --input-type=module > "$temp_file" <<'NODE'
const body = process.env.NOTES_BODY ?? "";
const tag = process.env.RELEASE_TAG;
const repo = process.env.RELEASE_REPO;
const appImageName = process.env.APPIMAGE_NAME;

const linuxLines = [
  `* 🐧 [Download for Linux (x86_64 AppImage)](https://github.com/${repo}/releases/download/${tag}/${appImageName})`,
];

const withoutOldLinux = body
  .split(/\r?\n/)
  .filter((line) => !line.includes("[Download for Linux (x86_64 AppImage)]"));

if (withoutOldLinux[0] === "## Direct Downloads") {
  let insertAt = 1;
  while (insertAt < withoutOldLinux.length && withoutOldLinux[insertAt].startsWith("* ")) {
    insertAt += 1;
  }
  withoutOldLinux.splice(insertAt, 0, ...linuxLines);
  process.stdout.write(`${withoutOldLinux.join("\n").replace(/\n*$/, "")}\n`);
} else {
  process.stdout.write(
    ["## Direct Downloads", ...linuxLines, "", withoutOldLinux.join("\n").replace(/\n*$/, "")]
      .join("\n")
      .replace(/\n*$/, "") + "\n",
  );
}
NODE

  gh release edit "$tag" --notes-file "$temp_file"
  rm -f "$temp_file"
}

while (( $# > 0 )); do
  case "$1" in
    -t|--tag) (( $# >= 2 )) || die "$1 requires a value."; TAG_NAME="$2"; shift 2 ;;
    -o|--output-dir) (( $# >= 2 )) || die "$1 requires a value."; OUTPUT_DIR="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-notes-patch) SKIP_NOTES_PATCH=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

cd "$REPO_ROOT"

require_command git
require_command gh
require_command npm
require_command node
require_command sha256sum

PACKAGE_VERSION="$(read_package_version)"
assert_version "$PACKAGE_VERSION"

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
[[ -n "$REPO" ]] || die "Unable to resolve GitHub repository with gh."

if (( DRY_RUN )); then
  log "Dry run only; no build, upload, or release-note changes will be made."
elif (( ! ALLOW_DIRTY )); then
  assert_clean_worktree
fi

if (( ! SKIP_BUILD && ! DRY_RUN )); then
  log "Build Linux AppImage"
  npm run package:linux
fi

if (( DRY_RUN && ! SKIP_BUILD )); then
  VERSION="$PACKAGE_VERSION"
  SOURCE_APPIMAGE="<created by npm run package:linux>"
else
  SOURCE_APPIMAGE="$(find_latest_appimage)"
  VERSION="$(detect_appimage_version "$SOURCE_APPIMAGE")"
fi

assert_version "$VERSION"
if [[ -n "$TAG_NAME" ]]; then
  assert_tag_matches_version "$TAG_NAME" "$VERSION"
else
  TAG_NAME="v$VERSION"
fi

OUTPUT_PATH="$REPO_ROOT/$OUTPUT_DIR"
APPIMAGE_NAME="kkterm-$VERSION-linux-x86_64.AppImage"
SHA_NAME="$APPIMAGE_NAME.sha256"
APPIMAGE_PATH="$OUTPUT_PATH/$APPIMAGE_NAME"
SHA_PATH="$OUTPUT_PATH/$SHA_NAME"

log "Version:       $VERSION"
log "Release tag:   $TAG_NAME"
log "Repository:    $REPO"
log "Target triple: $TARGET_TRIPLE"
log "Source AppImage: $SOURCE_APPIMAGE"
log "AppImage asset:  $APPIMAGE_PATH"

if (( DRY_RUN )); then
  exit 0
fi

git fetch --tags
git rev-parse "$TAG_NAME" >/dev/null 2>&1 || die "Local tag not found: $TAG_NAME (the Windows release flow creates it)."
gh release view "$TAG_NAME" >/dev/null || die "GitHub release not found: $TAG_NAME"

mkdir -p "$OUTPUT_PATH"
cp "$SOURCE_APPIMAGE" "$APPIMAGE_PATH"
( cd "$OUTPUT_PATH" && sha256sum "$APPIMAGE_NAME" > "$SHA_NAME" )

log "Upload Linux assets"
gh release upload "$TAG_NAME" "$APPIMAGE_PATH" "$SHA_PATH" --clobber

if (( ! SKIP_NOTES_PATCH )); then
  log "Patch GitHub Release notes"
  patch_release_notes "$TAG_NAME" "$REPO" "$APPIMAGE_NAME"
fi

log "Linux release assets published."
