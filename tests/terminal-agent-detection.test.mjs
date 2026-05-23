import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      verbatimModuleSyntax: true,
    },
  });
  const encoded = encodeURIComponent(transpiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("terminal agent detector promotes command and OSC title matches", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const codexDetector = createTerminalAgentDetector();
  codexDetector.observeInput("codex --model gpt-5.3-codex\r");
  assert.equal(codexDetector.getDetectedAgent()?.id, "codex");

  const claudeDetector = createTerminalAgentDetector();
  claudeDetector.observeOutput("\x1b]0;Claude Code - auth-refactor\x07");
  assert.equal(claudeDetector.getDetectedAgent()?.id, "claude");
});

test("terminal agent detector keeps ordinary transcript mentions below badge threshold", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex was mentioned in this README paragraph.\r\n");

  assert.equal(detector.getDetectedAgent(), null);
});

test("terminal agent detector recognizes the Codex startup screen from output", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput(
    [
      "OpenAI Codex (v0.133.0)",
      "model: gpt-5.5 medium   /model to change",
      "directory: ~",
      "Tip: New Use /fast to enable our fastest inference with increased plan usage.",
      "Run /review on my current changes",
    ].join("\r\n"),
  );

  assert.equal(detector.getDetectedAgent()?.id, "codex");
});

test("terminal agent detector recognizes the Claude Code startup screen from output", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput(
    [
      "Claude Code",
      "Welcome to Claude Code!",
      "/help for help, /status for your current setup",
      "cwd: /home/ryan/project",
    ].join("\r\n"),
  );

  assert.equal(detector.getDetectedAgent()?.id, "claude");
});

test("terminal agent detector clears after a shell prompt returns", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeOutput("\r\nryan@pb60:~$ ");

  assert.equal(detector.getDetectedAgent(), null);
});

test("terminal agent detector clears for common Linux macOS and Windows prompts", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const returnedPrompts = [
    "\r\n\u001b[32mryan@pb60\u001b[0m:\u001b[34m~\u001b[0m$ ",
    "\r\nroot@server:/var/log# ",
    "\r\nryan@MacBook-Pro ~ % ",
    "\r\nPS C:\\Users\\example> ",
    "\r\nC:\\Users\\example> ",
  ];

  for (const prompt of returnedPrompts) {
    const detector = createTerminalAgentDetector();
    detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
    assert.equal(detector.getDetectedAgent()?.id, "codex");

    detector.observeOutput(prompt);

    assert.equal(detector.getDetectedAgent(), null, `expected prompt to clear detection: ${JSON.stringify(prompt)}`);
  }
});

test("terminal agent detector clears when a restored prompt appears at the output tail", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeOutput("\x1b[?25h\x1b[?1049lTip: New Use /fast to enable our fastest inference with increased plan usage.ryan@pb60:~$ ");

  assert.equal(detector.getDetectedAgent(), null);
});

test("terminal agent detector clears on alternate screen exit without redetecting stale text", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeOutput("\x1b[?1049lOpenAI Codex (v0.133.0)\r\n/model to change\r\n");

  assert.equal(detector.getDetectedAgent(), null);
});

test("terminal agent detector clears after an empty managed terminal title", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("\x1b]0;Claude Code - refactor\x07");
  assert.equal(detector.getDetectedAgent()?.id, "claude");

  detector.observeOutput("\x1b]0;\x07");

  assert.equal(detector.getDetectedAgent(), null);
});

test("terminal agent detector clears when the user submits agent exit commands", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  for (const exitInput of ["/exit\r", "/quit\r", "exit\r", "quit\r", ":q\r", "\u0004"]) {
    const detector = createTerminalAgentDetector();
    detector.observeOutput("Claude Code\r\nWelcome to Claude Code!\r\n/help for help, /status for your current setup\r\n");
    assert.equal(detector.getDetectedAgent()?.id, "claude");

    detector.observeInput(exitInput);

    assert.equal(detector.getDetectedAgent(), null, `expected exit input to clear detection: ${JSON.stringify(exitInput)}`);
  }
});

test("terminal agent detector switches after returning to shell between agents", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeOutput("\r\nryan@pb60:~$ ");
  assert.equal(detector.getDetectedAgent(), null);

  detector.observeOutput("Claude Code\r\nWelcome to Claude Code!\r\n/help for help, /status for your current setup\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "claude");

  detector.observeOutput("\r\nryan@pb60:~$ ");
  assert.equal(detector.getDetectedAgent(), null);

  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");
});

test("terminal agent detector switches when another agent command starts before prompt clear", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeInput("claude\r");
  assert.equal(detector.getDetectedAgent()?.id, "claude");

  detector.observeInput("codex\r");
  assert.equal(detector.getDetectedAgent()?.id, "codex");
});

test("terminal agent detector prefers newer agent evidence over older accumulated score", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector();
  detector.observeOutput("OpenAI Codex (v0.133.0)\r\n/model to change\r\nRun /review on my current changes\r\n");
  detector.observeOutput("Codex CLI\r\nUse /skills to list available skills\r\n");
  assert.equal(detector.getDetectedAgent()?.id, "codex");

  detector.observeOutput("Claude Code\r\nWelcome to Claude Code!\r\n/help for help, /status for your current setup\r\n");

  assert.equal(detector.getDetectedAgent()?.id, "claude");
});

test("terminal agent detector can be extended with new agent rules", async () => {
  const { createTerminalAgentDetector } = await importTypeScriptModule(
    new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url),
  );

  const detector = createTerminalAgentDetector([
    {
      id: "goose",
      label: "Goose",
      shortLabel: "GS",
      commandNames: ["goose"],
      titlePatterns: [/goose/i],
      textPatterns: [/goose session/i],
    },
  ]);
  detector.observeInput("goose session\r");

  assert.equal(detector.getDetectedAgent()?.id, "goose");
});
