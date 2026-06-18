import assert from "node:assert/strict";
import test from "node:test";
import {
  LOG_PARSER_TYPES,
  detectLogParserType,
  parseLogLines,
} from "../src/modules/workspace/connections/file-viewer/logParser.ts";

test("offers common log parser types for the Document log viewer", () => {
  assert.deepEqual(
    LOG_PARSER_TYPES.map((parser) => parser.id),
    [
      "auto",
      "generic",
      "json",
      "logfmt",
      "syslog",
      "http-access",
      "windows-event",
      "java-stack",
      "container",
    ],
  );
});

test("auto-detects common log signatures from sample lines", () => {
  assert.equal(detectLogParserType('{"level":"error","msg":"failed"}'), "json");
  assert.equal(detectLogParserType("level=warn method=GET status=503"), "logfmt");
  assert.equal(detectLogParserType("<34>1 2026-06-18T12:00:00Z host app 123 ID47 - msg"), "syslog");
  assert.equal(detectLogParserType("Jun 18 12:00:00 host sshd[123]: Accepted publickey"), "syslog");
  assert.equal(
    detectLogParserType('127.0.0.1 - - [18/Jun/2026:12:00:00 +0000] "GET / HTTP/1.1" 404 512'),
    "http-access",
  );
  assert.equal(detectLogParserType("2026-06-18 12:00:00,000 ERROR [main] app failed"), "java-stack");
  assert.equal(detectLogParserType("Level: Warning Event ID: 4625 Source: Security"), "windows-event");
  assert.equal(detectLogParserType("app-7d9c nginx 2026-06-18T12:00:00Z stderr F panic"), "container");
});

test("parses selected formats into level-colored rows", () => {
  const rows = parseLogLines(
    [
      '{"severity":"critical","message":"disk full"}',
      '10.0.0.1 - - [18/Jun/2026:12:00:00 +0000] "POST /api HTTP/1.1" 500 12',
      "ts=2026-06-18T12:00:01Z level=debug msg=retrying",
    ].join("\n"),
    "auto",
  );

  assert.equal(rows[0].parser, "json");
  assert.equal(rows[0].level, "error");
  assert.equal(rows[0].message, "disk full");
  assert.equal(rows[1].parser, "http-access");
  assert.equal(rows[1].level, "error");
  assert.match(rows[1].message, /POST \/api/);
  assert.equal(rows[2].parser, "logfmt");
  assert.equal(rows[2].level, "debug");
  assert.match(rows[2].message, /retrying/);
});
