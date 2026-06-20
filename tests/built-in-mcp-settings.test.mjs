import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("built-in MCP settings are presented on every supported platform", async () => {
  const source = await readFile(
    new URL("../src/modules/settings/AiSettings.tsx", import.meta.url),
    "utf8",
  );

  // The bridge is cross-platform (named pipe on Windows, Unix socket on
  // macOS/Linux), so the controls gate on supportsBuiltInMcp(), not Windows.
  assert.match(source, /import \{ supportsBuiltInMcp \} from "\.\.\/\.\.\/lib\/platform"/);
  assert.match(
    source,
    /supportsBuiltInMcp\(\)\s*\?\s*\([\s\S]*settings\.builtInMcpServerEnabled[\s\S]*settings\.builtInMcpAllowAllDangerous[\s\S]*\)\s*:\s*null/,
  );
  assert.doesNotMatch(
    source,
    /isWindowsPlatform\(\)\s*\?\s*\([\s\S]*settings\.builtInMcpServerEnabled/,
    "built-in MCP controls must not be gated behind isWindowsPlatform()",
  );
});

test("built-in MCP config opens only from the explicit Show config button", async () => {
  const source = await readFile(
    new URL("../src/modules/settings/AiSettings.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /<div className="settings-toggle-row built-in-mcp-server-row">[\s\S]*setShowBuiltInMcpConfig\(true\)[\s\S]*<\/div>/,
  );
  assert.doesNotMatch(
    source,
    /<label className="settings-toggle-row built-in-mcp-server-row">/,
    "the config button must not be the label target for the server toggle",
  );
});
