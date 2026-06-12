#!/usr/bin/env zsh
set -euo pipefail

KEY_PATH=${TAURI_SIGNING_PRIVATE_KEY_PATH:-$HOME/.tauri/kkterm-updater.key}

normalize_tauri_signing_key() {
  local key_content first_line

  key_content="$1"
  first_line="${key_content%%$'\n'*}"

  # Tauri expects base64 of the full minisign key box (untrusted comment +
  # payload). Wrap a raw box if given one; otherwise pass through verbatim.
  if [[ "$first_line" == "untrusted comment:"* ]]; then
    printf '%s' "$key_content" | base64
    return
  fi

  print -r -- "$key_content"
}

extract_tauri_signing_key() {
  normalize_tauri_signing_key "$(<"$1")"
}

if [[ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]]; then
  if [[ ! -f "$KEY_PATH" ]]; then
    print -u2 "Missing Tauri updater signing key: $KEY_PATH"
    print -u2 "Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH before running npm run package:macos."
    exit 1
  fi

  export TAURI_SIGNING_PRIVATE_KEY="$(extract_tauri_signing_key "$KEY_PATH")"
else
  export TAURI_SIGNING_PRIVATE_KEY="$(normalize_tauri_signing_key "$TAURI_SIGNING_PRIVATE_KEY")"
fi

export TAURI_SIGNING_PRIVATE_KEY_PATH="$KEY_PATH"

npm exec tauri -- build --target aarch64-apple-darwin --bundles app,dmg "$@"
