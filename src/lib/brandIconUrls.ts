import { brandIconIdFromRef, isKnownBrandIconId } from "./brandIcons";
import defaultIcon from "../assets/installer-icons/default.svg?url";
import sevenZipIcon from "../assets/installer-icons/7zip.svg?url";
import anthropicIcon from "../assets/installer-icons/anthropic.svg?url";
import antigravityIcon from "../assets/installer-icons/antigravity.svg?url";
import astralIcon from "../assets/installer-icons/astral.svg?url";
import bentoPdfIcon from "../assets/installer-icons/bentopdf.svg?url";
import brunoIcon from "../assets/installer-icons/bruno.svg?url";
import claudeCodeIcon from "../assets/installer-icons/claude-code.svg?url";
import codexIcon from "../assets/installer-icons/codex.svg?url";
import cursorIcon from "../assets/installer-icons/cursor.svg?url";
import dittoIcon from "../assets/installer-icons/ditto.png?url";
import dockerIcon from "../assets/installer-icons/docker.svg?url";
import everythingIcon from "../assets/installer-icons/everything.png?url";
import excalidrawIcon from "../assets/installer-icons/excalidraw.svg?url";
import ffmpegIcon from "../assets/installer-icons/ffmpeg.svg?url";
import flowiseIcon from "../assets/installer-icons/flowise.png?url";
import geminiIcon from "../assets/installer-icons/gemini.svg?url";
import gitIcon from "../assets/installer-icons/git.svg?url";
import githubIcon from "../assets/installer-icons/github.svg?url";
import hermesAgentIcon from "../assets/installer-icons/hermes-agent.svg?url";
import langflowIcon from "../assets/installer-icons/langflow.svg?url";
import linuxIcon from "../assets/installer-icons/linux.svg?url";
import n8nIcon from "../assets/installer-icons/n8n.svg?url";
import nodejsIcon from "../assets/installer-icons/nodedotjs.svg?url";
import notepadppIcon from "../assets/installer-icons/notepadpp.svg?url";
import ohMyPoshIcon from "../assets/installer-icons/oh-my-posh.svg?url";
import ollamaIcon from "../assets/installer-icons/ollama.svg?url";
import openClawIcon from "../assets/installer-icons/openclaw.png?url";
import openFlowKitIcon from "../assets/installer-icons/openflowkit.svg?url";
import openWebuiIcon from "../assets/installer-icons/open-webui.png?url";
import openaiIcon from "../assets/installer-icons/openai.svg?url";
import opencodeIcon from "../assets/installer-icons/opencode.svg?url";
import powershellIcon from "../assets/installer-icons/powershell.svg?url";
import psmuxIcon from "../assets/installer-icons/psmux.svg?url";
import powerToysIcon from "../assets/installer-icons/powertoys.png?url";
import pythonIcon from "../assets/installer-icons/python.svg?url";
import rustIcon from "../assets/installer-icons/rust.svg?url";
import rustDeskIcon from "../assets/installer-icons/rustdesk.svg?url";
import shareXIcon from "../assets/installer-icons/sharex.svg?url";
import sysinternalsSuiteIcon from "../assets/installer-icons/sysinternals-suite.png?url";
import tailscaleIcon from "../assets/installer-icons/tailscale.svg?url";
import vscodeIcon from "../assets/installer-icons/vscode.png?url";
import alacrittyIcon from "../assets/connection-icons/tools/alacritty.svg?url";
import bashIcon from "../assets/connection-icons/tools/gnubash.svg?url";
import codeiumIcon from "../assets/connection-icons/tools/codeium.svg?url";
import fishIcon from "../assets/connection-icons/tools/fishshell.svg?url";
import githubCopilotIcon from "../assets/connection-icons/tools/githubcopilot.svg?url";
import iterm2Icon from "../assets/connection-icons/tools/iterm2.svg?url";
import tmuxIcon from "../assets/connection-icons/tools/tmux.svg?url";
import visualStudioCodeIcon from "../assets/connection-icons/tools/visualstudiocode.svg?url";
import weztermIcon from "../assets/connection-icons/tools/wezterm.svg?url";
import windsurfIcon from "../assets/connection-icons/tools/windsurf.svg?url";
import windowsTerminalIcon from "../assets/connection-icons/tools/windowsterminal.svg?url";
import zshIcon from "../assets/connection-icons/tools/zsh.svg?url";

const brandIconUrlById: Record<string, string> = {
  "installer-default": defaultIcon,
  "7zip": sevenZipIcon,
  "openai-codex": openaiIcon,
  "claude-code": anthropicIcon,
  "claude-code-installer": claudeCodeIcon,
  codex: codexIcon,
  opencode: opencodeIcon,
  cursor: cursorIcon,
  astral: astralIcon,
  bentopdf: bentoPdfIcon,
  bruno: brunoIcon,
  ditto: dittoIcon,
  docker: dockerIcon,
  everything: everythingIcon,
  excalidraw: excalidrawIcon,
  ffmpeg: ffmpegIcon,
  flowise: flowiseIcon,
  git: gitIcon,
  "github-cli": githubIcon,
  "hermes-agent": hermesAgentIcon,
  langflow: langflowIcon,
  n8n: n8nIcon,
  nodejs: nodejsIcon,
  notepadpp: notepadppIcon,
  ollama: ollamaIcon,
  "oh-my-posh": ohMyPoshIcon,
  openflowkit: openFlowKitIcon,
  "open-webui": openWebuiIcon,
  openclaw: openClawIcon,
  powertoys: powerToysIcon,
  python: pythonIcon,
  rust: rustIcon,
  rustdesk: rustDeskIcon,
  sharex: shareXIcon,
  "sysinternals-suite": sysinternalsSuiteIcon,
  tailscale: tailscaleIcon,
  vscode: vscodeIcon,
  "github-copilot": githubCopilotIcon,
  windsurf: windsurfIcon,
  codeium: codeiumIcon,
  "gemini-cli": geminiIcon,
  antigravity: antigravityIcon,
  "visual-studio-code": visualStudioCodeIcon,
  bash: bashIcon,
  zsh: zshIcon,
  fish: fishIcon,
  powershell: powershellIcon,
  psmux: psmuxIcon,
  "windows-terminal": windowsTerminalIcon,
  wsl: linuxIcon,
  iterm2: iterm2Icon,
  wezterm: weztermIcon,
  alacritty: alacrittyIcon,
  tmux: tmuxIcon,
};

export function brandIconUrlForId(id: string): string | null {
  return isKnownBrandIconId(id) ? brandIconUrlById[id] ?? null : null;
}

export function brandIconRefToUrl(value: string | null | undefined): string | null {
  const id = brandIconIdFromRef(value);
  return id ? brandIconUrlForId(id) : null;
}
