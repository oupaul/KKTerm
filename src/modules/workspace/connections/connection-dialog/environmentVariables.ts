export type EnvironmentShellFamily = "cmd" | "powershell" | "posix";
export type CliAccountTool = "claude-code" | "codex";
export type EnvironmentVariableSource = "literal" | "cliAccount";

export type ManagedEnvironmentVariable = {
  name: string;
  value: string;
  source: EnvironmentVariableSource;
};

export type EnvironmentValidationError = "invalidName" | "duplicateName" | "multilineValue";
export type ParsedEnvironmentBlock =
  | { status: "none"; variables: [] }
  | { status: "ok"; variables: ManagedEnvironmentVariable[] }
  | { status: "malformed"; variables: [] };

const CURRENT_MARKER = "KKTerm environment variables";
const LEGACY_MARKER = "KKTerm CLI account environment";
const MANAGED_MARKER_PATTERN = new RegExp(
  `^(?:#|REM) (?:${CURRENT_MARKER}|${LEGACY_MARKER}) begin\\r?\\n[\\s\\S]*?^(?:#|REM) (?:${CURRENT_MARKER}|${LEGACY_MARKER}) end`,
  "m",
);

export function classifyEnvironmentShell(shell: string): EnvironmentShellFamily | null {
  const normalized = shell.trim().toLowerCase();
  const commandMatch = normalized.match(/^(?:"([^"]+)"|(\S+))/u);
  const command = commandMatch?.[1] ?? commandMatch?.[2] ?? "";
  const commandParts = command.split(/[\\/]/u);
  const executable = commandParts[commandParts.length - 1]?.replace(/\.exe$/u, "") ?? "";
  if (executable === "cmd") return "cmd";
  if (executable === "powershell" || executable === "pwsh") return "powershell";
  if (executable === "wsl" || executable === "bash" || executable === "zsh") return "posix";
  return null;
}

export function validateEnvironmentVariables(
  variables: ManagedEnvironmentVariable[],
): EnvironmentValidationError | null {
  const names = new Set<string>();
  for (const variable of variables) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(variable.name)) return "invalidName";
    if (/\r|\n/u.test(variable.value)) return "multilineValue";
    const normalizedName = variable.name.toLowerCase();
    if (names.has(normalizedName)) return "duplicateName";
    names.add(normalizedName);
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

export function createCliAccountVariable(
  tool: CliAccountTool,
  label: string,
  family: EnvironmentShellFamily,
): ManagedEnvironmentVariable {
  const slug = slugCliAccountLabel(label);
  if (!slug) throw new Error("Account label must contain a letter or number.");
  const suffix = family === "posix" ? `kkterm/cli-accounts/${tool}/${slug}` : `KKTerm\\cli-accounts\\${tool}\\${slug}`;
  const root = family === "cmd" ? "%LOCALAPPDATA%" : family === "powershell" ? "$env:LOCALAPPDATA" : "${XDG_DATA_HOME:-$HOME/.local/share}";
  return {
    name: tool === "claude-code" ? "CLAUDE_CONFIG_DIR" : "CODEX_HOME",
    value: family === "posix" ? `${root}/${suffix}` : `${root}\\${suffix}`,
    source: "cliAccount",
  };
}

function commentPrefix(family: EnvironmentShellFamily) {
  return family === "cmd" ? "REM" : "#";
}

function escapeLiteral(value: string, family: EnvironmentShellFamily) {
  if (family === "cmd") {
    return value.replace(/\^/gu, "^^").replace(/%/gu, "^%").replace(/!/gu, "^^^!").replace(/"/gu, '^"');
  }
  if (family === "powershell") return value.replace(/`/gu, "``").replace(/\$/gu, "`$").replace(/"/gu, '`"');
  return value.replace(/\\/gu, "\\\\").replace(/\$/gu, "\\$").replace(/`/gu, "\\`").replace(/"/gu, '\\"');
}

function unescapeLiteral(value: string, family: EnvironmentShellFamily) {
  if (family === "cmd") return value.replace(/\^\^\^!/gu, "!").replace(/\^(.)/gu, "$1");
  if (family === "powershell") return value.replace(/`(.)/gu, "$1");
  return value.replace(/\\([\\$`"])/gu, "$1");
}

function assignment(variable: ManagedEnvironmentVariable, family: EnvironmentShellFamily) {
  const value = variable.source === "cliAccount" ? variable.value : escapeLiteral(variable.value, family);
  if (family === "cmd") return `set "${variable.name}=${value}"`;
  if (family === "powershell") return `$env:${variable.name} = "${value}"`;
  return `export ${variable.name}="${value}"`;
}

function directoryCommand(variable: ManagedEnvironmentVariable, family: EnvironmentShellFamily) {
  if (family === "cmd") return `if not exist "%${variable.name}%" mkdir "%${variable.name}%"`;
  if (family === "powershell") return `New-Item -ItemType Directory -Force -Path $env:${variable.name} | Out-Null`;
  return `mkdir -p "$${variable.name}"`;
}

export function renderEnvironmentBlock(
  variables: ManagedEnvironmentVariable[],
  family: EnvironmentShellFamily,
) {
  if (validateEnvironmentVariables(variables)) throw new Error("Environment variables are invalid.");
  const prefix = commentPrefix(family);
  const lines = [`${prefix} ${CURRENT_MARKER} begin`];
  for (const variable of variables) {
    lines.push(`${prefix} KKTerm variable ${variable.source}`, assignment(variable, family));
    if (variable.source === "cliAccount") lines.push(directoryCommand(variable, family));
  }
  lines.push(`${prefix} ${CURRENT_MARKER} end`);
  return lines.join("\n");
}

function parseAssignment(line: string, family: EnvironmentShellFamily) {
  if (family === "cmd") return line.match(/^set "([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)"$/u);
  if (family === "powershell") return line.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*) = "([\s\S]*)"$/u);
  return line.match(/^export ([A-Za-z_][A-Za-z0-9_]*)="([\s\S]*)"$/u);
}

function looksLikeCliAccount(variable: ManagedEnvironmentVariable) {
  const tool = variable.name === "CLAUDE_CONFIG_DIR" ? "claude-code" : variable.name === "CODEX_HOME" ? "codex" : null;
  return Boolean(tool && variable.value.replace(/\\/gu, "/").includes(`/cli-accounts/${tool}/`));
}

function parseLegacyBlock(lines: string[], family: EnvironmentShellFamily): ParsedEnvironmentBlock {
  const assignmentLine = lines[1];
  const match = assignmentLine ? parseAssignment(assignmentLine, family) : null;
  if (!match) return { status: "malformed", variables: [] };
  const variable = { name: match[1], value: match[2], source: "cliAccount" as const };
  if (!looksLikeCliAccount(variable) || lines.length !== 4) return { status: "malformed", variables: [] };
  return { status: "ok", variables: [variable] };
}

export function parseEnvironmentBlock(script: string, family: EnvironmentShellFamily): ParsedEnvironmentBlock {
  const match = script.match(MANAGED_MARKER_PATTERN);
  if (!match) {
    return /KKTerm (?:environment variables|CLI account environment) (?:begin|end)/u.test(script)
      ? { status: "malformed", variables: [] }
      : { status: "none", variables: [] };
  }
  const lines = match[0].split(/\r?\n/u);
  if (lines[0]?.includes(LEGACY_MARKER)) return parseLegacyBlock(lines, family);

  const variables: ManagedEnvironmentVariable[] = [];
  let index = 1;
  while (index < lines.length - 1) {
    const sourceMatch = lines[index]?.match(/^(?:#|REM) KKTerm variable (literal|cliAccount)$/u);
    const valueMatch = lines[index + 1] ? parseAssignment(lines[index + 1], family) : null;
    if (!sourceMatch || !valueMatch) return { status: "malformed", variables: [] };
    const source = sourceMatch[1] as EnvironmentVariableSource;
    const rawValue = valueMatch[2];
    const variable = {
      name: valueMatch[1],
      value: source === "literal" ? unescapeLiteral(rawValue, family) : rawValue,
      source,
    };
    index += 2;
    if (source === "cliAccount") {
      if (!looksLikeCliAccount(variable) || lines[index] !== directoryCommand(variable, family)) {
        return { status: "malformed", variables: [] };
      }
      index += 1;
    }
    variables.push(variable);
  }
  return validateEnvironmentVariables(variables)
    ? { status: "malformed", variables: [] }
    : { status: "ok", variables };
}

export function applyEnvironmentBlock(script: string, block: string) {
  const newline = script.includes("\r\n") ? "\r\n" : "\n";
  const renderedBlock = newline === "\n" ? block : block.replace(/\n/gu, newline);
  const match = script.match(MANAGED_MARKER_PATTERN);
  if (match?.index !== undefined) {
    if (renderedBlock) return script.replace(MANAGED_MARKER_PATTERN, renderedBlock);
    const before = script.slice(0, match.index);
    const after = script.slice(match.index + match[0].length);
    if (!after) return before.replace(/(?:\r?\n){1,2}$/u, "");
    return before.endsWith(newline) && after.startsWith(newline) ? before + after.slice(newline.length) : before + after;
  }
  if (!renderedBlock) return script;
  if (!script) return renderedBlock;
  return `${script}${script.endsWith(newline) ? newline : `${newline}${newline}`}${renderedBlock}`;
}

export function retargetEnvironmentBlock(script: string, targetFamily: EnvironmentShellFamily) {
  const targetParsed = parseEnvironmentBlock(script, targetFamily);
  if (targetParsed.status !== "malformed") return script;

  for (const sourceFamily of ["cmd", "powershell", "posix"] satisfies EnvironmentShellFamily[]) {
    if (sourceFamily === targetFamily) continue;
    const parsed = parseEnvironmentBlock(script, sourceFamily);
    if (parsed.status !== "ok") continue;
    const variables = parsed.variables.map((variable) => retargetCliAccountVariable(variable, targetFamily));
    return applyEnvironmentBlock(script, renderEnvironmentBlock(variables, targetFamily));
  }
  return script;
}

function retargetCliAccountVariable(
  variable: ManagedEnvironmentVariable,
  family: EnvironmentShellFamily,
): ManagedEnvironmentVariable {
  if (variable.source !== "cliAccount") return variable;
  const tool = variable.name === "CLAUDE_CONFIG_DIR" ? "claude-code" : variable.name === "CODEX_HOME" ? "codex" : null;
  const pathParts = variable.value.replace(/\\/gu, "/").split("/");
  const label = pathParts[pathParts.length - 1];
  return tool && label ? createCliAccountVariable(tool, label, family) : variable;
}
