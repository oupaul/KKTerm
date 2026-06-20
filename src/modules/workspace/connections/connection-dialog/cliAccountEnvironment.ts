export type CliAccountTool = "claude-code" | "codex";
export type CliAccountShellFamily = "cmd" | "powershell" | "posix";

const GENERATED_BLOCK_PATTERN =
  /^(?:#|REM) KKTerm CLI account environment begin\r?\n[\s\S]*?^(?:#|REM) KKTerm CLI account environment end/m;

export function classifyCliAccountShell(shell: string): CliAccountShellFamily | null {
  const normalized = shell.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const commandMatch = normalized.match(/^(?:"([^"]+)"|(\S+))/u);
  const command = commandMatch?.[1] ?? commandMatch?.[2] ?? "";
  const commandParts = command.split(/[\\/]/u);
  const executable = commandParts[commandParts.length - 1]?.replace(/\.exe$/u, "") ?? "";
  if (executable === "powershell" || executable === "pwsh") {
    return "powershell";
  }
  if (executable === "cmd") {
    return "cmd";
  }
  if (executable === "wsl" || executable === "bash" || executable === "zsh") {
    return "posix";
  }
  return null;
}

export function slugCliAccountLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/_+/gu, "_")
    .replace(/^[-_]+|[-_]+$/gu, "");
}

export function cliAccountDirectory(tool: CliAccountTool, slug: string, family: CliAccountShellFamily) {
  if (family === "cmd") {
    return `%LOCALAPPDATA%\\KKTerm\\cli-accounts\\${tool}\\${slug}`;
  }
  if (family === "powershell") {
    return `$env:LOCALAPPDATA\\KKTerm\\cli-accounts\\${tool}\\${slug}`;
  }
  return `\${XDG_DATA_HOME:-$HOME/.local/share}/kkterm/cli-accounts/${tool}/${slug}`;
}

export function buildCliAccountBlock(
  tool: CliAccountTool,
  label: string,
  family: CliAccountShellFamily,
) {
  const slug = slugCliAccountLabel(label);
  if (!slug) {
    throw new Error("Account label must contain a letter or number.");
  }

  const variable = tool === "claude-code" ? "CLAUDE_CONFIG_DIR" : "CODEX_HOME";
  const directory = cliAccountDirectory(tool, slug, family);
  if (family === "cmd") {
    return [
      "REM KKTerm CLI account environment begin",
      `set "${variable}=${directory}"`,
      `if not exist "%${variable}%" mkdir "%${variable}%"`,
      "REM KKTerm CLI account environment end",
    ].join("\n");
  }
  if (family === "powershell") {
    return [
      "# KKTerm CLI account environment begin",
      `$env:${variable} = "${directory}"`,
      `New-Item -ItemType Directory -Force -Path $env:${variable} | Out-Null`,
      "# KKTerm CLI account environment end",
    ].join("\n");
  }
  return [
    "# KKTerm CLI account environment begin",
    `export ${variable}="${directory}"`,
    `mkdir -p "$${variable}"`,
    "# KKTerm CLI account environment end",
  ].join("\n");
}

export function applyCliAccountBlock(script: string, block: string) {
  const newline = script.includes("\r\n") ? "\r\n" : "\n";
  const renderedBlock = newline === "\n" ? block : block.replace(/\n/gu, newline);
  if (GENERATED_BLOCK_PATTERN.test(script)) {
    return script.replace(GENERATED_BLOCK_PATTERN, renderedBlock);
  }
  if (!script) {
    return block;
  }
  return `${script}${script.endsWith(newline) ? newline : `${newline}${newline}`}${renderedBlock}`;
}
