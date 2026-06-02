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

## Releasing an ARM64 build

The release pipeline publishes x64 by default. To also build and attach the
native ARM64 installer to the GitHub release, opt in:

- **Workflow:** run the **Release** workflow with the `include_arm64` input set
  to `true`.
- **Local:** `pwsh scripts/release-github.ps1 -IncludeArm64` (combine with the
  usual `-Draft` / `-Prerelease` / `-DryRun` switches as needed).

When enabled, the release builds the ARM64 installer with
`package:installer:arm64 -InstallMissing` (which provisions the cross-build
toolchain on the runner) and appends
`kkterm-<version>-windows-arm64-setup.exe` plus its `.sha256` to the release
assets next to the x64 artifacts.

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

## Per-feature ARM64 awareness in feature code

The packaging work above makes a native build; the following data/path paths
make that build behave natively rather than under emulation.

### Addressed

1. **Installer Helper `downloadInstaller` fallbacks are now arch-aware.** The
   `downloadInstaller` provider schema accepts optional `arm64Url` /
   `arm64FileName` fields. On a native ARM64 build (`cfg!(target_arch =
   "aarch64")`), `Provider::download_target` prefers the ARM64 asset and
   otherwise falls back to the default x64 asset (which still runs under
   emulation). `installer/catalog.v1.json` populates native ARM64 downloads for
   the entries with deterministic vendor URL schemes: **GitHub CLI**
   (`gh_*_windows_arm64.msi`), **VS Code** (`win32-arm64-user`), and **rustup**
   (`win.rustup.rs/aarch64`). The `winget` providers (52 entries) already
   auto-select the ARM64 build. Remaining x64-only `downloadInstaller` entries
   (Cursor, 7-Zip, Notepad++, PowerToys, Everything, ShareX, Bruno, Claude, …)
   keep working under emulation and can adopt the same two fields when a native
   ARM64 URL is confirmed.

2. **AI coding-usage detection finds ARM64 Codex.**
   `src-tauri/src/ai_coding_usage.rs` probes the Codex VS Code extension's
   per-arch `bin/` folder, preferring `windows-arm64` on an ARM64 build and
   falling back to `windows-x86_64` (and vice versa on x64).

### Remaining (non-blocking)

3. **App-detection registry views.**
   `src-tauri/src/installer/detect.rs` enumerates the native 64-bit registry
   view via `KEY_WOW64_64KEY` (which resolves to the ARM64 view on Windows on
   Arm) plus the 32-bit WOW view, and matches catalog entries on the bare
   uninstall subkey, so native ARM64 installs are still detected. The synthetic
   `ARP\Machine\X64` / `ARP\User\X64` labels are cosmetic; x64 apps installed
   under emulation that register in a separate emulated view are the only
   edge case left to verify on real ARM64 hardware.

## Diagnostics

`src-tauri/src/diagnostics.rs` already records `target_arch` at runtime
(`std::env::consts::ARCH`), so an ARM64 build self-identifies correctly in
diagnostics bundles — no change needed.
