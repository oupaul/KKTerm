// Maps each catalog recipe id to a bundled SVG icon URL. Unknown ids fall
// back to a generic package icon. The SVG files in src/assets/installer-icons
// are vendor brand marks from simple-icons (MIT/CC0) plus a hand-drawn
// default. We use Vite's `?url` import so the asset is fingerprinted and
// served by the renderer like any other static file.
//
// When a new recipe is added to installer/catalog.v1.json, either drop a
// matching <id>.svg into the icons folder (it will be auto-picked) or add
// an explicit entry here pointing at an existing svg.

import defaultIcon from "../../assets/installer-icons/default.svg?url";
import anthropic from "../../assets/installer-icons/anthropic.svg?url";
import astral from "../../assets/installer-icons/astral.svg?url";
import bruno from "../../assets/installer-icons/bruno.svg?url";
import cursor from "../../assets/installer-icons/cursor.svg?url";
import docker from "../../assets/installer-icons/docker.svg?url";
import gemini from "../../assets/installer-icons/gemini.svg?url";
import git from "../../assets/installer-icons/git.svg?url";
import github from "../../assets/installer-icons/github.svg?url";
import linux from "../../assets/installer-icons/linux.svg?url";
import n8n from "../../assets/installer-icons/n8n.svg?url";
import nodedotjs from "../../assets/installer-icons/nodedotjs.svg?url";
import notepadpp from "../../assets/installer-icons/notepadpp.svg?url";
import ollama from "../../assets/installer-icons/ollama.svg?url";
import openai from "../../assets/installer-icons/openai.svg?url";
import python from "../../assets/installer-icons/python.svg?url";
import vscode from "../../assets/installer-icons/vscode.svg?url";

const RECIPE_ICON_URLS: Record<string, string> = {
  git,
  "github-cli": github,
  "windows-terminal": defaultIcon, // simple-icons no longer ships a Windows Terminal mark
  vscode,
  cursor,
  notepadpp,
  "nvm-windows": nodedotjs,
  "nodejs-lts": nodedotjs,
  "node-bundle": nodedotjs,
  uv: astral,
  "python-3-12": python,
  "python-bundle": python,
  wsl: linux,
  "docker-desktop": docker,
  nssm: defaultIcon,
  "claude-code-cli": anthropic,
  "codex-cli": openai,
  "gemini-cli": gemini,
  ollama,
  n8n,
  bruno,
  ripgrep: defaultIcon,
  jq: defaultIcon,
  fzf: defaultIcon,
  openclaw: defaultIcon,
};

export function iconUrlForRecipe(recipeId: string): string {
  return RECIPE_ICON_URLS[recipeId] ?? defaultIcon;
}

export const FALLBACK_ICON_URL = defaultIcon;
