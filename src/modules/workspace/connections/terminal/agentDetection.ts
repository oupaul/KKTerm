export type TerminalAgentId = "codex" | "claude" | string;

export type TerminalAgentRule = {
  id: TerminalAgentId;
  label: string;
  shortLabel: string;
  commandNames: string[];
  titlePatterns: RegExp[];
  textPatterns: RegExp[];
};

export type DetectedTerminalAgent = {
  id: TerminalAgentId;
  label: string;
  shortLabel: string;
  confidence: "medium" | "high";
};

const BADGE_SCORE_THRESHOLD = 2;
const HIGH_CONFIDENCE_SCORE = 3;
const MAX_INPUT_BUFFER_CHARS = 512;
const MAX_TEXT_BUFFER_CHARS = 12_000;
const UNIX_USER_HOST_PROMPT_PATTERN = /^[\w.-]+@[\w.-]+(?::[^\r\n]*|\s+[^\r\n]*)?[$#%]\s*$/;
const POWERSHELL_PROMPT_PATTERN = /^PS\s+[^\r\n>]*>\s*$/;
const COMMAND_PROMPT_PATTERN = /^[A-Za-z]:\\[^\r\n>]*>\s*$/;
const UNIX_USER_HOST_PROMPT_TAIL_PATTERN = /[\w.-]+@[\w.-]+(?::[^\r\n$#%>]{0,96}|\s+[^\r\n$#%>]{0,96})?[$#%]\s*$/;
const WINDOWS_PROMPT_TAIL_PATTERN = /(?:PS\s+)?[A-Za-z]:\\[^\r\n>]{0,160}>\s*$/;
const AGENT_EXIT_COMMANDS = new Set(["/exit", "/quit", "exit", "quit", ":q"]);
const ALTERNATE_SCREEN_EXIT_PATTERN = /\x1b\[\?(?:47|1047|1049)l/;

export const DEFAULT_TERMINAL_AGENT_RULES: TerminalAgentRule[] = [
  {
    id: "codex",
    label: "Codex",
    shortLabel: "CX",
    commandNames: ["codex", "@openai/codex"],
    titlePatterns: [/\bcodex\b/i],
    textPatterns: [
      /\bCodex CLI\b/,
      /\bOpenAI Codex\b/,
      /\b\/model to change\b/,
      /\bRun \/review on my current changes\b/,
      /\bUse \/skills to list available skills\b/,
    ],
  },
  {
    id: "claude",
    label: "Claude Code",
    shortLabel: "CC",
    commandNames: ["claude", "claude-code", "@anthropic-ai/claude-code"],
    titlePatterns: [/\bclaude(?:\s+code)?\b/i],
    textPatterns: [
      /\bClaude Code\b/,
      /\bWelcome to Claude Code!?/i,
      /\b\/help for help\b/i,
      /\b\/status for your current setup\b/i,
      /\b\/terminal-setup\b/,
      /\b\/ultraplan\b/,
      /\b\/ultrareview\b/,
    ],
  },
];

type AgentScore = {
  rule: TerminalAgentRule;
  score: number;
  lastSeen: number;
};

export type TerminalAgentDetector = {
  observeInput: (data: string) => void;
  observeOutput: (data: string) => void;
  getDetectedAgent: () => DetectedTerminalAgent | null;
  reset: () => void;
};

export function createTerminalAgentDetector(
  rules: TerminalAgentRule[] = DEFAULT_TERMINAL_AGENT_RULES,
): TerminalAgentDetector {
  const scores = new Map<TerminalAgentId, AgentScore>();
  const matchedTextPatterns = new Map<TerminalAgentId, Set<number>>();
  let signalSequence = 0;
  let inputBuffer = "";
  let textBuffer = "";

  function addScore(rule: TerminalAgentRule, value: number) {
    const previous = scores.get(rule.id);
    scores.set(rule.id, {
      rule,
      score: (previous?.score ?? 0) + value,
      lastSeen: ++signalSequence,
    });
  }

  function clearDetection() {
    scores.clear();
    matchedTextPatterns.clear();
    textBuffer = "";
  }

  function detectCommand(commandLine: string) {
    if (isAgentExitCommand(commandLine)) {
      clearDetection();
      return;
    }

    const commandTokens = commandLineTokens(commandLine);
    if (commandTokens.length === 0) {
      return;
    }

    for (const rule of rules) {
      if (rule.commandNames.some((name) => commandTokens.includes(normalizeCommandName(name)))) {
        addScore(rule, HIGH_CONFIDENCE_SCORE);
      }
    }
  }

  function detectTitle(title: string) {
    if (title.trim() === "") {
      clearDetection();
      return;
    }

    for (const rule of rules) {
      if (rule.titlePatterns.some((pattern) => pattern.test(title))) {
        addScore(rule, HIGH_CONFIDENCE_SCORE);
      }
    }
  }

  function detectVisibleText(text: string) {
    textBuffer = trimStartToMax(textBuffer + stripTerminalControls(text), MAX_TEXT_BUFFER_CHARS);
    if (hasReturnedToShellPrompt(textBuffer)) {
      clearDetection();
      return;
    }

    for (const rule of rules) {
      const matchedIndexes = matchedTextPatterns.get(rule.id) ?? new Set<number>();
      let newMatches = 0;
      rule.textPatterns.forEach((pattern, index) => {
        if (!matchedIndexes.has(index) && pattern.test(textBuffer)) {
          matchedIndexes.add(index);
          newMatches += 1;
        }
      });
      if (newMatches > 0) {
        matchedTextPatterns.set(rule.id, matchedIndexes);
        addScore(rule, newMatches);
      }
    }
  }

  return {
    observeInput(data: string) {
      for (const character of data) {
        if (character === "\u0004") {
          clearDetection();
          inputBuffer = "";
          continue;
        }

        if (character === "\r" || character === "\n") {
          detectCommand(inputBuffer);
          inputBuffer = "";
          continue;
        }

        if (character === "\u007f" || character === "\b") {
          inputBuffer = inputBuffer.slice(0, -1);
          continue;
        }

        if (character >= " " && character !== "\u007f") {
          inputBuffer = trimStartToMax(inputBuffer + character, MAX_INPUT_BUFFER_CHARS);
        }
      }
    },
    observeOutput(data: string) {
      if (includesAlternateScreenExit(data)) {
        clearDetection();
        return;
      }

      for (const title of extractTerminalTitles(data)) {
        detectTitle(title);
      }
      detectVisibleText(data);
    },
    getDetectedAgent() {
      let best: AgentScore | null = null;
      for (const score of scores.values()) {
        if (score.score < BADGE_SCORE_THRESHOLD) {
          continue;
        }
        if (!best || score.lastSeen > best.lastSeen) {
          best = score;
        }
      }

      if (!best) {
        return null;
      }

      return {
        id: best.rule.id,
        label: best.rule.label,
        shortLabel: best.rule.shortLabel,
        confidence: best.score >= HIGH_CONFIDENCE_SCORE ? "high" : "medium",
      };
    },
    reset() {
      clearDetection();
      inputBuffer = "";
    },
  };
}

function commandLineTokens(commandLine: string) {
  return splitShellLike(commandLine).map(normalizeCommandName).filter(Boolean);
}

function splitShellLike(value: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const character of value.trim()) {
    if ((character === "'" || character === '"') && quote === null) {
      quote = character;
      continue;
    }
    if (quote === character) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function normalizeCommandName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\\/g, "/");
  const basename = normalized.split("/").pop() ?? normalized;
  return basename.replace(/\.(exe|cmd|bat|ps1)$/i, "");
}

function extractTerminalTitles(data: string) {
  const titles: string[] = [];
  let index = 0;

  while (index < data.length) {
    const start = data.indexOf("\x1b]", index);
    if (start === -1) {
      break;
    }

    const belEnd = data.indexOf("\x07", start + 2);
    const stEnd = data.indexOf("\x1b\\", start + 2);
    const end = minPositive(belEnd, stEnd);
    if (end === -1) {
      break;
    }

    const payload = data.slice(start + 2, end);
    const separator = payload.indexOf(";");
    if (separator > 0) {
      const code = payload.slice(0, separator);
      if (code === "0" || code === "2") {
        titles.push(payload.slice(separator + 1));
      }
    }

    index = end + (end === stEnd ? 2 : 1);
  }

  return titles;
}

function minPositive(left: number, right: number) {
  if (left === -1) {
    return right;
  }
  if (right === -1) {
    return left;
  }
  return Math.min(left, right);
}

function stripTerminalControls(data: string) {
  return data
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

function trimStartToMax(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function hasReturnedToShellPrompt(value: string) {
  const lastLine = value.split(/\r?\n|\r/).pop()?.trimEnd() ?? "";
  const tail = value.slice(-240);
  return (
    UNIX_USER_HOST_PROMPT_PATTERN.test(lastLine) ||
    POWERSHELL_PROMPT_PATTERN.test(lastLine) ||
    COMMAND_PROMPT_PATTERN.test(lastLine) ||
    UNIX_USER_HOST_PROMPT_TAIL_PATTERN.test(tail) ||
    WINDOWS_PROMPT_TAIL_PATTERN.test(tail)
  );
}

function includesAlternateScreenExit(data: string) {
  return ALTERNATE_SCREEN_EXIT_PATTERN.test(data);
}

function isAgentExitCommand(commandLine: string) {
  return AGENT_EXIT_COMMANDS.has(commandLine.trim().toLowerCase());
}
