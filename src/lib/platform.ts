export type RuntimePlatform = "windows" | "macos" | "linux" | "unknown";

export function currentPlatform(): RuntimePlatform {
  if (typeof navigator === "undefined") {
    return "windows";
  }

  const platformText = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (platformText.includes("mac")) {
    return "macos";
  }
  if (platformText.includes("linux")) {
    return "linux";
  }
  if (platformText.includes("windows") || platformText.includes("win32")) {
    return "windows";
  }
  return "unknown";
}

export function isWindowsPlatform() {
  return currentPlatform() === "windows";
}

export function isMacPlatform() {
  return currentPlatform() === "macos";
}

// macOS keeps the native traffic-light window controls (the overlay title bar
// applied in Rust), so the custom minimize/maximize/close buttons must not be
// drawn there and the title label must clear the controls on the left.
export function usesNativeWindowControls() {
  return isMacPlatform();
}

export function supportsInstallerHelper() {
  return isWindowsPlatform();
}

// The built-in MCP server bridge runs on Windows (named pipe) and macOS/Linux
// (Unix domain socket). Only fully-unknown runtimes hide the Settings controls.
export function supportsBuiltInMcp() {
  return currentPlatform() !== "unknown";
}

export function supportsRdp() {
  // Windows uses the native ActiveX control; macOS uses the in-app IronRDP
  // canvas client. Both render RDP inside the workspace.
  return isWindowsPlatform() || isMacPlatform();
}

// RDP on macOS renders to the shared remote-desktop <canvas> via the IronRDP
// backend (rdp-canvas-event), like VNC — not the Windows native ActiveX overlay.
export function usesCanvasRdp() {
  return isMacPlatform();
}

export function defaultLocalShell() {
  if (isWindowsPlatform()) {
    return "powershell.exe";
  }
  return currentPlatform() === "macos" ? "/bin/zsh" : "/bin/bash";
}
