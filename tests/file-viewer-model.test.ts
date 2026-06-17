// Behavioral tests for the File Viewer detection model: extension and
// magic-byte routing to viewer kinds, the always-available text/hex fallbacks,
// and the text-vs-bytes load decision.
import assert from "node:assert/strict";
import test from "node:test";
import {
  availableViewerKinds,
  detectViewerKind,
  fileBaseName,
  fileExtension,
  viewerLoadsText,
  viewerUsesExternalDependency,
} from "../src/modules/workspace/connections/file-viewer/fileViewerModel.ts";
import { dependencyForKind } from "../src/modules/workspace/connections/file-viewer/fileViewerDependencies.ts";

test("detects viewer kind from extension", () => {
  assert.equal(detectViewerKind({ path: "/a/b/notes.md" }), "markdown");
  assert.equal(detectViewerKind({ path: "data.csv" }), "csv");
  assert.equal(detectViewerKind({ path: "data.tsv" }), "csv");
  assert.equal(detectViewerKind({ path: "config.json" }), "json");
  assert.equal(detectViewerKind({ path: "server.log" }), "log");
  assert.equal(detectViewerKind({ path: "events.ndjson" }), "log");
  assert.equal(detectViewerKind({ path: "main.rs" }), "text");
  assert.equal(detectViewerKind({ path: "photo.PNG" }), "image");
});

test("magic bytes win for unknown or misleading extensions", () => {
  // An image with no/unknown extension is detected from the probe magic.
  assert.equal(detectViewerKind({ path: "blob", magic: "jpeg" }), "image");
  // SQLite/zip/pdf are not text and have no dedicated viewer yet → hex fallback.
  assert.equal(detectViewerKind({ path: "db", magic: "sqlite", isText: false }), "hex");
});

test("unknown extension trusts the backend text heuristic", () => {
  assert.equal(detectViewerKind({ path: "mystery", isText: true }), "text");
  assert.equal(detectViewerKind({ path: "mystery.bin", isText: false }), "hex");
});

test("text and hex are always offered as fallbacks (except for images)", () => {
  const logKinds = availableViewerKinds({ path: "app.log", isText: true });
  assert.equal(logKinds[0], "log");
  assert.ok(logKinds.includes("text"));
  assert.ok(logKinds.includes("hex"));

  const imageKinds = availableViewerKinds({ path: "a.png", magic: "png" });
  assert.deepEqual(imageKinds, ["image", "hex"]);
});

test("viewerLoadsText is false for image, hex, and pdf", () => {
  assert.equal(viewerLoadsText("text"), true);
  assert.equal(viewerLoadsText("log"), true);
  assert.equal(viewerLoadsText("json"), true);
  assert.equal(viewerLoadsText("image"), false);
  assert.equal(viewerLoadsText("hex"), false);
  assert.equal(viewerLoadsText("pdf"), false);
});

test("pdf is detected and routed to its external dependency (Phase 2)", () => {
  assert.equal(detectViewerKind({ path: "report.pdf" }), "pdf");
  // Detected from probe magic even without a .pdf extension.
  assert.equal(detectViewerKind({ path: "download", magic: "pdf", isText: false }), "pdf");
  assert.deepEqual(availableViewerKinds({ path: "a.pdf" }), ["pdf", "hex"]);
  assert.equal(viewerUsesExternalDependency("pdf"), true);
  assert.equal(viewerUsesExternalDependency("text"), false);

  const dep = dependencyForKind("pdf");
  assert.equal(dep?.toolId, "poppler");
  assert.equal(dependencyForKind("text"), null);
});

test("path helpers handle windows and posix separators", () => {
  assert.equal(fileBaseName("C:\\logs\\app.log"), "app.log");
  assert.equal(fileBaseName("/var/log/syslog"), "syslog");
  assert.equal(fileExtension("/a/b/Archive.TAR.GZ"), "gz");
  // Extension-less well-known names fall back to the whole lowercased name.
  assert.equal(fileExtension("/repo/Dockerfile"), "dockerfile");
});
