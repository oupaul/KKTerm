import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("psmux session ids reserve names stored by other Connections", async () => {
  const source = await readFile(new URL("../src/store.ts", import.meta.url), "utf8");

  assert.match(source, /function loadReservedPsmuxSessionIds\(connectionId: string\)/);
  assert.match(
    source,
    /connectionUsesPsmux\(connection\)[\s\S]*?loadReservedPsmuxSessionIds\(connection\.id\)[\s\S]*?generateTmuxSessionId\(\[\.\.\.sessionIds, \.\.\.reservedSessionIds\]\)/,
  );
});
