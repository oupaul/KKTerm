import { osIconIdForDetection, osIconRefForId } from "../../../../lib/osIcons";

const WSL_PROGRAM_RE = /(?:^|[\\/])wsl(?:\.exe)?$/i;

export function isWslShell(shell: string | undefined): boolean {
  const parsed = parseCommandLine(shell);
  return parsed ? WSL_PROGRAM_RE.test(parsed.program) : false;
}

export function buildWslDistributionShell(distro: string): string {
  const trimmed = distro.trim();
  return trimmed ? `wsl.exe --distribution ${trimmed}` : "wsl.exe";
}

export function distroFromWslShell(shell: string | undefined): string {
  const parsed = parseCommandLine(shell);
  if (!parsed || !WSL_PROGRAM_RE.test(parsed.program)) {
    return "";
  }
  for (let index = 0; index < parsed.args.length; index += 1) {
    const arg = parsed.args[index];
    if ((arg === "--distribution" || arg === "-d") && parsed.args[index + 1]) {
      return parsed.args[index + 1];
    }
  }
  return "";
}

export function wslShellSelectorValue(shell: string | undefined): string {
  return isWslShell(shell) ? "wsl.exe" : shell?.trim() ?? "";
}

export function defaultWslConnectionName(distro: string): string | null {
  const trimmed = distro.trim();
  return trimmed ? `WSL - ${trimmed}` : null;
}

export function osIconRefForWslDistro(distro: string): string | null {
  const normalized = distro.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const tokens = normalized.split(/[\s_.-]+/).filter(Boolean);
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const candidates = [normalized, tokens[0], compact].filter(Boolean);
  for (const candidate of candidates) {
    const iconId = osIconIdForDetection({ id: candidate });
    if (iconId && iconId !== "linux") {
      return osIconRefForId(iconId);
    }
  }
  return null;
}

function parseCommandLine(commandLine: string | undefined) {
  const value = commandLine?.trim();
  if (!value) {
    return null;
  }
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === `"` || ch === "'") {
      if (quote === ch) {
        quote = null;
      } else if (!quote) {
        quote = ch;
      } else {
        current += ch;
      }
      continue;
    }
    if (/\s/.test(ch) && !quote) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    parts.push(current);
  }
  const [program, ...args] = parts;
  return program ? { args, program } : null;
}
