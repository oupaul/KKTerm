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

export function supportsRdp() {
  return isWindowsPlatform();
}

export function defaultLocalShell() {
  if (isWindowsPlatform()) {
    return "powershell.exe";
  }
  return currentPlatform() === "macos" ? "/bin/zsh" : "/bin/sh";
}
