#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_ROOT="${SCRIPT_DIR:h}"
TAURI_ROOT="$REPO_ROOT/src-tauri"
TARGET_ROOT="$TAURI_ROOT/target"

ARM64_CLI="$TARGET_ROOT/aarch64-apple-darwin/release/kkterm-cli"
X64_CLI="$TARGET_ROOT/x86_64-apple-darwin/release/kkterm-cli"
UNIVERSAL_DIR="$TARGET_ROOT/universal-apple-darwin/release"
UNIVERSAL_CLI="$UNIVERSAL_DIR/kkterm-cli"

if [[ ! -f "$ARM64_CLI" ]]; then
  print -u2 "Missing arm64 kkterm-cli sidecar: $ARM64_CLI"
  exit 1
fi

if [[ ! -f "$X64_CLI" ]]; then
  print -u2 "Missing x86_64 kkterm-cli sidecar: $X64_CLI"
  exit 1
fi

mkdir -p "$UNIVERSAL_DIR"
lipo -create "$ARM64_CLI" "$X64_CLI" -output "$UNIVERSAL_CLI"
chmod 755 "$UNIVERSAL_CLI"

print "Prepared universal macOS sidecar: $UNIVERSAL_CLI"
