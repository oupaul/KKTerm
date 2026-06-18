import type { RuntimePlatform } from "../../lib/platform";

export interface CustomShellPreset {
  commandLine: string;
  name: string;
}

const WINDOWS_CUSTOM_SHELL_PRESETS: CustomShellPreset[] = [
  {
    name: "Git Bash",
    commandLine: String.raw`C:\Program Files\Git\bin\bash.exe --login -i`,
  },
  {
    name: "Cygwin",
    commandLine: String.raw`C:\cygwin64\bin\bash.exe --login -i`,
  },
  {
    name: "MSYS2 UCRT64",
    commandLine: String.raw`C:\msys64\usr\bin\bash.exe --login -i`,
  },
];

const MACOS_CUSTOM_SHELL_PRESETS: CustomShellPreset[] = [
  {
    name: "Zsh",
    commandLine: "/bin/zsh",
  },
  {
    name: "Homebrew Bash",
    commandLine: "/opt/homebrew/bin/bash --login",
  },
  {
    name: "MacPorts Bash",
    commandLine: "/opt/local/bin/bash --login",
  },
  {
    name: "Fish",
    commandLine: "/opt/homebrew/bin/fish",
  },
  {
    name: "Nushell",
    commandLine: "/opt/homebrew/bin/nu",
  },
];

const LINUX_CUSTOM_SHELL_PRESETS: CustomShellPreset[] = [
  {
    name: "Bash",
    commandLine: "/bin/bash",
  },
  {
    name: "Zsh",
    commandLine: "/bin/zsh",
  },
  {
    name: "Fish",
    commandLine: "/usr/bin/fish",
  },
  {
    name: "Nushell",
    commandLine: "/usr/bin/nu",
  },
  {
    name: "PowerShell 7",
    commandLine: "/usr/bin/pwsh",
  },
];

export function customShellPresetsForPlatform(platform: RuntimePlatform): CustomShellPreset[] {
  if (platform === "macos") {
    return MACOS_CUSTOM_SHELL_PRESETS;
  }
  if (platform === "linux") {
    return LINUX_CUSTOM_SHELL_PRESETS;
  }
  return WINDOWS_CUSTOM_SHELL_PRESETS;
}

export function findCustomShellPreset(name: string, platform: RuntimePlatform): CustomShellPreset | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return customShellPresetsForPlatform(platform).find((preset) => preset.name.toLowerCase() === normalized);
}
