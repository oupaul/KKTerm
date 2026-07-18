// Launch classification for installed Install Helper tools. The tile-level
// Run button picks its behavior from `launchKindForRecipe`:
//   * "gui"   — start the installed program directly through the closed
//               backend allow-list (`installer_launch_app`).
//   * "cli"   — open the mini launcher dialog: sample commands plus a button
//               that opens a terminal (`installer_open_terminal_launcher`).
//   * "webUi" — open the installed info dialog, which already carries the
//               managed web app launcher (Run/Stop, Open web UI, service
//               registration).
//   * "suite" — open the installed info dialog, which already carries the
//               searchable quick-launch list (Sysinternals, Coreutils).
// Recipes not listed here get no Run button. The CLI sample lists mirror the
// Rust `terminal_launch_affordance` entries in
// src-tauri/src/installer/commands.rs — keep both sides in sync.

export type LaunchKind = "gui" | "cli" | "webUi" | "suite";

/// Installed GUI apps the backend can start directly. Mirrors the Rust
/// `gui_launch_affordance` allow-list.
const GUI_LAUNCH_RECIPES = new Set<string>([
  "vscode",
  "cursor",
  "notepadpp",
  "docker-desktop",
  "comfyui",
  "lmstudio",
  "bruno",
  "claude-desktop",
  "codex-desktop",
  "powertoys",
  "powershell-7",
  "everything",
  "ditto",
  "keepassxc",
  "7zip",
  "sharex",
  "tailscale",
  "rustdesk",
  "google-chrome",
  "firefox",
  "acrobat-reader",
  "obsidian",
  "drawio",
  "krita",
  "inkscape",
  "blender",
  "pencil",
  "vlc",
  "obs-studio",
  "xnview-mp",
  "audacity",
  "vcxsrv",
]);

/// Managed web apps whose installed dialog owns the run/stop/open/service
/// mini launcher. Mirrors `webUiAffordanceForRecipe` in InstallerToolDialog.
const WEB_UI_LAUNCH_RECIPES = new Set<string>([
  "n8n",
  "ollama",
  "flowise",
  "open-webui",
  "langflow",
  "excalidraw",
  "bentopdf",
  "openflowkit",
]);

/// Multi-command tool suites whose installed dialog owns the searchable
/// quick-launch list. Mirrors the Rust `quick_launch_affordance` entries.
const SUITE_LAUNCH_RECIPES = new Set<string>(["sysinternals-suite", "coreutils"]);

/// Sample usage lines for command-line tools, shown in the mini launcher
/// dialog and echoed by the spawned terminal. Format: `command  —  what it
/// does`; the first entry's command doubles as the terminal prefill on the
/// Rust side.
const CLI_LAUNCH_SAMPLES: Record<string, string[]> = {
  git: [
    "git clone <url>  —  copy a remote repository",
    "git status  —  show changed files",
    "git log --oneline -20  —  recent commits",
  ],
  winget: [
    "winget search <name>  —  find a package",
    "winget install <id>  —  install a package",
    "winget upgrade --all  —  update everything",
  ],
  chocolatey: [
    "choco search <name>  —  find a package",
    "choco install <id>  —  install a package (admin)",
    "choco upgrade all  —  update everything (admin)",
  ],
  "node-bundle": [
    "node --version  —  check the active Node runtime",
    "npm install <package>  —  add a package to a project",
    "nvm list  —  show installed Node versions",
  ],
  "python-bundle": [
    "python --version  —  check the active Python runtime",
    "uv venv  —  create a virtual environment",
    "uv pip install <package>  —  install into the environment",
  ],
  wsl: [
    "wsl  —  open the default Linux distribution",
    "wsl --list --verbose  —  show installed distributions",
    "wsl --update  —  update the WSL kernel",
  ],
  nssm: [
    "nssm install <service>  —  register a service (admin)",
    "nssm status <service>  —  check a service",
  ],
  "oh-my-posh": [
    "oh-my-posh init pwsh | Invoke-Expression  —  try it in this session",
    "oh-my-posh font install  —  install a Nerd Font",
  ],
  "claude-code-cli": [
    "claude  —  start Claude Code in this directory",
    "claude --help  —  list commands and flags",
  ],
  "codex-cli": [
    "codex  —  start Codex in this directory",
    "codex --help  —  list commands and flags",
  ],
  opencode: [
    "opencode  —  start OpenCode in this directory",
    "opencode --help  —  list commands and flags",
  ],
  rustup: [
    "rustup show  —  show the active toolchain",
    "rustup update  —  update Rust",
    "cargo new <name>  —  create a project",
  ],
  bun: [
    "bun init  —  create a project",
    "bun install  —  install dependencies",
    "bun run <script>  —  run a package script",
  ],
  ripgrep: [
    'rg "pattern"  —  search the current directory',
    'rg -i "error" -g "*.log"  —  case-insensitive search in .log files',
    "rg --files  —  list searchable files",
  ],
  jq: [
    "jq . data.json  —  pretty-print JSON",
    'Get-Content data.json | jq ".items[0]"  —  pick a field from piped JSON',
  ],
  fzf: [
    "fzf  —  fuzzy-pick a file from the current directory",
    "Get-ChildItem -Recurse -Name | fzf  —  fuzzy-filter any list",
  ],
  ffmpeg: [
    "ffmpeg -i input.mp4 output.mp3  —  convert media",
    "ffprobe input.mp4  —  inspect a media file",
  ],
  scrcpy: [
    "scrcpy  —  mirror a USB-connected Android device",
    "scrcpy --tcpip=<ip>  —  connect over Wi-Fi",
  ],
  psmux: [
    "psmux  —  start a terminal multiplexer session",
    "psmux --help  —  list commands and flags",
  ],
  "hermes-agent": [
    "hermes setup  —  configure providers and accounts",
    "hermes postinstall  —  optional dependencies",
    "hermes doctor  —  health check",
    "hermes  —  start chatting",
  ],
  openclaw: [
    "openclaw onboard --install-daemon  —  setup and managed startup",
    "openclaw doctor  —  check configuration",
    "openclaw gateway status  —  verify gateway",
  ],
};

export function launchKindForRecipe(recipeId: string): LaunchKind | null {
  if (GUI_LAUNCH_RECIPES.has(recipeId)) return "gui";
  if (recipeId in CLI_LAUNCH_SAMPLES) return "cli";
  if (WEB_UI_LAUNCH_RECIPES.has(recipeId)) return "webUi";
  if (SUITE_LAUNCH_RECIPES.has(recipeId)) return "suite";
  return null;
}

export function cliLaunchSamplesForRecipe(recipeId: string): string[] | null {
  return CLI_LAUNCH_SAMPLES[recipeId] ?? null;
}

/// Whether a suite's quick-launch terminal opens elevated (Sysinternals) or
/// as a normal prompt (Coreutils). Drives the terminal button label.
export function suiteTerminalIsElevated(recipeId: string): boolean {
  return recipeId === "sysinternals-suite";
}
