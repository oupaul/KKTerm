// Maps each catalog recipe id to a bundled icon URL. Unknown ids fall
// back to a generic package icon. The SVG files in src/assets/installer-icons
// are mostly vendor brand marks from Simple Icons plus a few compact
// official/repository PNG/SVG assets. See that folder's README for source and
// license notes. We use Vite's `?url` import so each asset is fingerprinted
// and served by the renderer like any other static file.
//
// When a new recipe is added to installer/catalog.v1.json, add an import and
// recipe-id entry here, or point the recipe id at an existing asset.

import defaultIcon from "../../assets/installer-icons/default.svg?url";
import sevenZip from "../../assets/installer-icons/7zip.svg?url";
import anthropic from "../../assets/installer-icons/anthropic.svg?url";
import astral from "../../assets/installer-icons/astral.svg?url";
import bruno from "../../assets/installer-icons/bruno.svg?url";
import cursor from "../../assets/installer-icons/cursor.svg?url";
import ditto from "../../assets/installer-icons/ditto.png?url";
import docker from "../../assets/installer-icons/docker.svg?url";
import everything from "../../assets/installer-icons/everything.png?url";
import excalidraw from "../../assets/installer-icons/excalidraw.svg?url";
import flowise from "../../assets/installer-icons/flowise.png?url";
import git from "../../assets/installer-icons/git.svg?url";
import github from "../../assets/installer-icons/github.svg?url";
import hermesAgent from "../../assets/installer-icons/hermes-agent.svg?url";
import langflow from "../../assets/installer-icons/langflow.svg?url";
import linux from "../../assets/installer-icons/linux.svg?url";
import n8n from "../../assets/installer-icons/n8n.svg?url";
import nodedotjs from "../../assets/installer-icons/nodedotjs.svg?url";
import notepadpp from "../../assets/installer-icons/notepadpp.svg?url";
import ollama from "../../assets/installer-icons/ollama.svg?url";
import openWebui from "../../assets/installer-icons/open-webui.png?url";
import openai from "../../assets/installer-icons/openai.svg?url";
import openclaw from "../../assets/installer-icons/openclaw.png?url";
import opencode from "../../assets/installer-icons/opencode.svg?url";
import powertoys from "../../assets/installer-icons/powertoys.png?url";
import python from "../../assets/installer-icons/python.svg?url";
import rust from "../../assets/installer-icons/rust.svg?url";
import rustdesk from "../../assets/installer-icons/rustdesk.svg?url";
import sharex from "../../assets/installer-icons/sharex.svg?url";
import sysinternalsSuite from "../../assets/installer-icons/sysinternals-suite.png?url";
import tailscale from "../../assets/installer-icons/tailscale.svg?url";
import vscode from "../../assets/installer-icons/vscode.png?url";

const RECIPE_ICON_URLS: Record<string, string> = {
  git,
  "github-cli": github,
  vscode,
  cursor,
  notepadpp,
  "nvm-windows": nodedotjs,
  "node-bundle": nodedotjs,
  uv: astral,
  "python-bundle": python,
  wsl: linux,
  "docker-desktop": docker,
  nssm: defaultIcon,
  "claude-code-cli": anthropic,
  "codex-cli": openai,
  "antigravity-cli": defaultIcon,
  ollama,
  n8n,
  "open-webui": openWebui,
  flowise,
  langflow,
  bruno,
  ripgrep: defaultIcon,
  jq: defaultIcon,
  fzf: defaultIcon,
  opencode,
  rustup: rust,
  "codex-desktop": openai,
  "claude-desktop": anthropic,
  "hermes-agent": hermesAgent,
  powertoys,
  "sysinternals-suite": sysinternalsSuite,
  everything,
  ditto,
  tailscale,
  rustdesk,
  "7zip": sevenZip,
  sharex,
  excalidraw,
  openclaw,
};

export function iconUrlForRecipe(recipeId: string): string {
  return RECIPE_ICON_URLS[recipeId] ?? defaultIcon;
}

export const FALLBACK_ICON_URL = defaultIcon;
