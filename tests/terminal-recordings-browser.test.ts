import assert from "node:assert/strict";
import test from "node:test";
import type { TerminalRecordingEntry } from "../src/lib/tauri";
import type { Connection } from "../src/types";
import {
  DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS,
  buildTerminalRecordingsExportName,
  filterAndSortTerminalRecordings,
  recordingConnectionIdFragment,
  resizeTerminalRecordingColumn,
  resolveTerminalRecordingRows,
  terminalRecordingGridMinimumWidth,
  terminalRecordingGridTemplate,
} from "../src/modules/workspace/connections/terminal/terminalRecordingsModel";

const sshConnection: Connection = {
  id: "conn-1234567890abcdef",
  name: "Production East",
  host: "prod-east.example.net",
  user: "ops",
  type: "ssh",
  status: "idle",
};

function recording(overrides: Partial<TerminalRecordingEntry> = {}): TerminalRecordingEntry {
  return {
    fileName: "20260715-213830-000--session.txt",
    path: "C:\\recordings\\production-east--conn-12345678\\20260715-213830-000--session.txt",
    sizeBytes: 1_024,
    modifiedAtMillis: 1_752_615_000_000,
    startedAtMillis: 1_752_614_310_000,
    durationMillis: 690_000,
    connectionIdFragment: "conn-12345678",
    connectionFolderLabel: "production-east",
    ...overrides,
  };
}

test("recording Connection id fragments match the Rust folder contract", () => {
  assert.equal(recordingConnectionIdFragment(sshConnection.id), "conn-12345678");
  assert.equal(recordingConnectionIdFragment("quick-connection"), "quick-co");
});

test("universal recording rows resolve the current host but keep deleted-Connection fallbacks", () => {
  const rows = resolveTerminalRecordingRows(
    [
      recording(),
      recording({
        path: "C:\\recordings\\retired-host--missing1\\old.txt",
        fileName: "old.txt",
        connectionIdFragment: "missing1",
        connectionFolderLabel: "retired-host",
      }),
    ],
    [sshConnection],
  );

  assert.equal(rows[0].host, "prod-east.example.net");
  assert.equal(rows[0].recordingType, "ssh");
  assert.equal(rows[0].connectionId, sshConnection.id);
  assert.equal(rows[1].host, "retired host");
  assert.equal(rows[1].recordingType, "unknown");
});

test("full-text results combine with filename metadata before host/date sorting", () => {
  const rows = resolveTerminalRecordingRows(
    [
      recording(),
      recording({
        fileName: "older.txt",
        path: "C:\\recordings\\production-east--conn-12345678\\older.txt",
        startedAtMillis: 1_752_600_000_000,
      }),
    ],
    [sshConnection],
  );
  const contentMatches = new Set([rows[1].id]);
  const filtered = filterAndSortTerminalRecordings({
    rows,
    query: "systemctl restart",
    contentMatches,
    host: "prod-east.example.net",
    range: "all",
    sort: { key: "date", direction: "desc" },
    now: 1_752_620_000_000,
  });

  assert.deepEqual(filtered.map((row) => row.fileName), ["older.txt"]);
});

test("recording export names include one host, latest local stamp, and session count", () => {
  const rows = resolveTerminalRecordingRows([recording()], [sshConnection]);
  const name = buildTerminalRecordingsExportName(rows);
  assert.match(name, /^kkterm_prod-east\.example\.net_\d{8}-\d{4}_1sessions\.zip$/);
});

test("recording columns resize independently, clamp to readable minimums, and share one grid template", () => {
  assert.equal(DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS.name, 330);
  const widerSummary = resizeTerminalRecordingColumn(
    DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS,
    "summary",
    460,
  );
  const clampedName = resizeTerminalRecordingColumn(widerSummary, "name", 20);

  assert.equal(widerSummary.summary, 460);
  assert.equal(widerSummary.name, DEFAULT_TERMINAL_RECORDING_COLUMN_WIDTHS.name);
  assert.equal(clampedName.name, 240);
  assert.equal(
    terminalRecordingGridTemplate(clampedName),
    "36px 240px 94px 140px 112px 92px 92px 84px minmax(460px, 1fr)",
  );
  assert.equal(terminalRecordingGridMinimumWidth(clampedName), 1_350);
});
