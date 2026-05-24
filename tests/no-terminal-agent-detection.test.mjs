import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";

test("SSH and local terminal coding-agent detection is not shipped", async () => {
  assert.equal(
    existsSync(new URL("../src/modules/workspace/connections/terminal/agentDetection.ts", import.meta.url)),
    false,
  );

  const terminalWorkspace = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(terminalWorkspace.includes("createTerminalAgentDetector"), false);
  assert.equal(terminalWorkspace.includes("TerminalAgentBadge"), false);
});
