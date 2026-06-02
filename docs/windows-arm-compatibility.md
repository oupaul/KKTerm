# Windows on Arm (ARM64) Compatibility

This document records the compatibility review of KKTerm for **Windows on Arm**
(the `aarch64-pc-windows-msvc` target) and how to produce a native ARM64
installer.

## TL;DR

A native ARM64 build is achievable today. No feature relies on x64-only APIs at
runtime — every native surface uses OS APIs that ship as ARM64 on Windows 11 on
Arm. The work is almost entirely in the **build toolchain** and a few
**x64-hardcoded data paths** in feature code. Use:

```powershell
npm run package:installer:arm64            # build (toolchain must be present)
npm run package:installer:arm64 -- -InstallMissing   # also download/install the toolchain
npm run package:installer:arm64 -- -ToolchainOnly    # just check/install toolchain
```

The output is `artifacts/kkterm-<version>-windows-arm64-setup.exe` plus a
`.sha256` checksum, matching the x64 packaging script's conventions.

## Required toolchain (detected & optionally downloaded by the script)

`scripts/package-installer-arm64.ps1` detects each piece and, with
`-InstallMissing`, downloads it via `winget`:

| Piece | Why it's needed | winget id |
| --- | --- | --- |
| Rust target `aarch64-pc-windows-msvc` | compile the app + `kkterm-cli` sidecar for ARM64 | `rustup target add` |
| MSVC **C++ ARM64 build tools** | linker/CRT for the ARM64 target | `Microsoft.VisualStudio.2022.BuildTools` + component `…VC.Tools.ARM64` |
| **CMake** | builds `aws-lc-sys` (rustls' default crypto provider, via `reqwest`/`lettre`) for ARM64 | `Kitware.CMake` |
| **NASM** | `aws-lc-sys` assembly build dependency | `NASM.NASM` |
| Node.js + npm | frontend build (`beforeBuildCommand`) | `OpenJS.NodeJS.LTS` |

The MSVC ARM64 component install is best-effort; if winget can't add it
non-interactively, run the Visual Studio Installer and add
**"MSVC v143 - VS 2022 C++ ARM64 build tools"**.

Cross-building from an x64 host is supported (the script passes
`--target aarch64-pc-windows-msvc`); building on an ARM64 host works too.

## Per-feature compatibility

All of these use OS-provided APIs that exist natively on ARM64 Windows:

| Feature | Native dependency | ARM64 status |
| --- | --- | --- |
| Local terminal | ConPTY (`portable-pty`, dynamically loaded `kernel32`) | ✅ native |
| SSH / SFTP | `russh` + `ring` 0.17 | ✅ native |
| FTP / SMTP TLS | SChannel (`async-native-tls`) | ✅ native |
| HTTP / API TLS | `rustls` + `aws-lc-rs` | ✅ runtime; ⚠️ needs CMake/NASM at build |
| Serial | `serial2` | ✅ native |
| VNC | `vnc-rs` (pure Rust) | ✅ native |
| RDP | MS RDP ActiveX `mstscax.dll` via COM/`LoadLibrary` | ✅ native (control ships ARM64) |
| Screenshots | GDI BitBlt/DIB | ✅ native |
| Keychain | Windows Credential Manager | ✅ native |
| Ping / net tools | `winping` (IcmpSendEcho2 / IP Helper) | ✅ native |
| Tray / single-instance / auto-start | Win32 + registry | ✅ native |
| Title-bar / rounded corners | DWM | ✅ native |
| WebView2 | Evergreen runtime, `downloadBootstrapper` | ✅ auto-selects ARM64 |
| NSIS installer | 32-bit x86 stub | ✅ runs under emulation, installs ARM64 payload |

### Notes

- **WebView2:** `tauri.conf.json` uses `webviewInstallMode.downloadBootstrapper`,
  which downloads the correct ARM64 Evergreen runtime automatically. No change
  needed.
- **NSIS:** the installer executable itself is a 32-bit x86 stub (Tauri's NSIS
  template). It runs fine under x86 emulation on ARM64 and installs the native
  ARM64 binaries. This is expected and not a defect.

## Features that are NOT fully ARM64-aware (gaps to be aware of)

These do not block a build but degrade on ARM64 and are worth a follow-up. They
are **data/path** issues, not architectural blockers:

1. **Installer Helper catalog is x64-pinned.** `installer/catalog.v1.json` has
   ~20 `downloadInstaller` URLs hardcoded to x64 builds (VS Code `win32-x64`,
   Cursor `x64`, 7-Zip `x64`, Notepad++ `x64`, PowerToys `x64`, Everything
   `x64`, ShareX `x64`, Bruno `x64`, Claude `win32/x64`, `rustup` `x86_64`,
   …). On ARM64 these install x64 apps that run under emulation; several
   (PowerToys, Everything, VS Code, 7-Zip) have native ARM64 builds that aren't
   offered. The `winget` providers (52 entries) generally auto-select the ARM64
   build, so winget-backed entries are fine — the gap is the
   `downloadInstaller` fallbacks.

2. **AI coding-usage detection misses ARM64 Codex.**
   `src-tauri/src/ai_coding_usage.rs` hardcodes the Codex CLI path segment
   `bin/windows-x86_64/codex.exe`; on ARM64 the binary lives under
   `windows-arm64`, so usage detection would not find it.

3. **App-detection registry roots are x64-only.**
   `src-tauri/src/installer/detect.rs` scans `ARP\Machine\X64` /
   `ARP\User\X64`; ARM64-native installs that register under an `ARM64` ARP
   root may not be detected.

These are intentionally left out of the build-enablement change so the
packaging work stays surgical; they can be addressed when ARM64 becomes a
shipped target.

## Diagnostics

`src-tauri/src/diagnostics.rs` already records `target_arch` at runtime
(`std::env::consts::ARCH`), so an ARM64 build self-identifies correctly in
diagnostics bundles — no change needed.
