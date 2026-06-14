#!/usr/bin/env bash
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

# Build the Linux AppImage bundle.
#
# Distribution on Linux is AppImage-only (see docs/LINUX_PORT.md). This script
# only builds; it does not bump the version, create a tag, or upload anything.
# The shared src-tauri/tauri.conf.json bundle targets (nsis/app/dmg) are left
# untouched: the AppImage target is selected here via the CLI so Windows/macOS
# bundling is unaffected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

TARGET_TRIPLE="${LINUX_TARGET_TRIPLE:-x86_64-unknown-linux-gnu}"
KEY_PATH="${TAURI_SIGNING_PRIVATE_KEY_PATH:-$HOME/.tauri/kkterm-updater.key}"

normalize_tauri_signing_key() {
  local key_content first_line

  key_content="$1"
  first_line="${key_content%%$'\n'*}"

  # Tauri expects base64 of the full minisign key box (untrusted comment +
  # payload). Wrap a raw box if given one; otherwise pass through verbatim.
  if [[ "$first_line" == "untrusted comment:"* ]]; then
    printf '%s' "$key_content" | base64 -w 0
    return
  fi

  printf '%s' "$key_content"
}

extract_tauri_signing_key() {
  normalize_tauri_signing_key "$(<"$1")"
}

if [[ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]]; then
  if [[ ! -f "$KEY_PATH" ]]; then
    printf 'Missing Tauri updater signing key: %s\n' "$KEY_PATH" >&2
    printf 'Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH before running npm run package:linux.\n' >&2
    exit 1
  fi

  export TAURI_SIGNING_PRIVATE_KEY="$(extract_tauri_signing_key "$KEY_PATH")"
else
  export TAURI_SIGNING_PRIVATE_KEY="$(normalize_tauri_signing_key "$TAURI_SIGNING_PRIVATE_KEY")"
fi

export TAURI_SIGNING_PRIVATE_KEY_PATH="$KEY_PATH"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"

# Building the AppImage runs appimagetool/linuxdeploy, which use FUSE at
# runtime. CI containers usually lack FUSE, so extract-and-run instead.
export APPIMAGE_EXTRACT_AND_RUN="${APPIMAGE_EXTRACT_AND_RUN:-1}"

"./node_modules/.bin/tauri" build --target "$TARGET_TRIPLE" --bundles appimage "$@"
