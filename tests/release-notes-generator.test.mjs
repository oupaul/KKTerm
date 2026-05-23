import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReleaseNotesPrompt,
  composeFallbackReleaseNotes,
  prependChangelogEntry,
} from "../scripts/generate-release-notes.mjs";

const sampleContext = {
  project: "KKTerm",
  version: "v0.1.32",
  previousTag: "v0.1.31",
  target: "HEAD",
  compareUrl: "https://github.com/ryantsai/KKTerm/compare/v0.1.31...v0.1.32",
  githubGeneratedNotes: "## What's Changed\n* Add terminal agent detection by @ryan in #132",
  commits: [
    {
      sha: "da94b9e",
      subject: "feat(terminal): implement coding agent detection and display in terminal pane",
      body: "",
      files: ["src/terminal/agentDetection.ts", "src/terminal/terminal.css"],
    },
    {
      sha: "4ca8a56",
      subject: "feat(ai-coding-usage): implement background refresh for AI coding usage providers",
      body: "",
      files: ["src/ai-coding-usage/refreshPolicy.ts"],
    },
  ],
};

test("buildReleaseNotesPrompt feeds bounded release context and KKTerm terminology to AI", () => {
  const prompt = buildReleaseNotesPrompt(sampleContext);

  assert.match(prompt, /Use only the supplied release context/);
  assert.match(prompt, /Connection, Session, Tab, Pane, Dashboard Widget Instance/);
  assert.match(prompt, /v0\.1\.31/);
  assert.match(prompt, /da94b9e/);
  assert.match(prompt, /GitHub generated notes/);
  assert.match(prompt, /Markdown only/);
  assert.match(prompt, /light IT humor/);
});

test("composeFallbackReleaseNotes creates a publishable markdown changelog without AI", () => {
  const notes = composeFallbackReleaseNotes(sampleContext);

  assert.match(notes, /^# KKTerm v0\.1\.32/m);
  assert.match(notes, /## Highlights/);
  assert.match(notes, /## Changes/);
  assert.match(notes, /terminal agent detection/);
  assert.match(notes, /da94b9e/);
  assert.match(notes, /Compare: https:\/\/github\.com\/ryantsai\/KKTerm\/compare\/v0\.1\.31\.\.\.v0\.1\.32/);
});

test("prependChangelogEntry inserts newest release below the changelog header", () => {
  const current = "# Changelog\n\nAll notable changes to KKTerm are documented here.\n\n## v0.1.31\n\n- Previous.\n";
  const entry = "# KKTerm v0.1.32\n\n## Highlights\n\n- New release.\n";

  const updated = prependChangelogEntry(current, entry);

  assert.match(updated, /^# Changelog\n\nAll notable changes to KKTerm are documented here\.\n\n## v0\.1\.32/m);
  assert.ok(updated.indexOf("## v0.1.32") < updated.indexOf("## v0.1.31"));
  assert.doesNotMatch(updated, /# KKTerm v0\.1\.32/);
});
