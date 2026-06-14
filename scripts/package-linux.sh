#!/usr/bin/env bash
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

# Building the AppImage runs appimagetool/linuxdeploy, which use FUSE at
# runtime. CI containers usually lack FUSE, so extract-and-run instead.
export APPIMAGE_EXTRACT_AND_RUN="${APPIMAGE_EXTRACT_AND_RUN:-1}"

npm exec tauri -- build --target "$TARGET_TRIPLE" --bundles appimage "$@"
