import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReleaseNotesPrompt,
  composeFallbackReleaseNotes,
  extractPrNumbers,
  prependDirectDownloads,
  prependChangelogEntry,
} from "../scripts/generate-release-notes.mjs";

const sampleContext = {
  project: "KKTerm",
  version: "v0.1.32",
  repo: "ryantsai/KKTerm",
  previousTag: "v0.1.31",
  target: "HEAD",
  compareUrl: "https://github.com/ryantsai/KKTerm/compare/v0.1.31...v0.1.32",
  githubGeneratedNotes: "## What's Changed\n* Add terminal recording controls by @ryan in #132",
  commits: [
    {
      sha: "da94b9e",
      subject: "feat(terminal): implement recording controls in terminal pane",
      body: "",
      files: ["src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", "src/modules/workspace/connections/terminal/terminal.css"],
    },
    {
      sha: "4ca8a56",
      subject: "feat(ai-coding-usage): implement background refresh for AI coding usage providers",
      body: "",
      files: ["src/modules/dashboard/widgets/builtin/ai-coding-usage/refreshPolicy.ts"],
    },
  ],
};

test("extractPrNumbers collects PR numbers from commit text and GitHub generated notes", () => {
  const commits = [
    { subject: "fix(terminal): handle disconnect (#42)", body: "" },
    { subject: "Merge pull request #57 from branch", body: "closes #100" },
  ];
  const notes = "* Some change by @user in https://github.com/ryantsai/KKTerm/pull/99\n* Another in #57";
  const prNumbers = extractPrNumbers(commits, notes);
  assert.ok(prNumbers.includes(42));
  assert.ok(prNumbers.includes(57));
  assert.ok(prNumbers.includes(99));
  assert.equal(prNumbers.filter((n) => n === 57).length, 1, "deduplicates PR numbers");
});

test("buildReleaseNotesPrompt instructs AI to credit linked issue reporters", () => {
  const contextWithReporters = {
    ...sampleContext,
    linkedIssueReporters: [{ number: 130, title: "Terminal flickers", reporter: "alice", prNumber: 132 }],
  };
  const prompt = buildReleaseNotesPrompt(contextWithReporters);
  assert.match(prompt, /linkedIssueReporters/);
  assert.match(prompt, /alice/);
});

test("buildReleaseNotesPrompt feeds bounded release context and KKTerm terminology to AI", () => {
  const prompt = buildReleaseNotesPrompt(sampleContext);

  assert.match(prompt, /Use only the supplied release context/);
  assert.match(prompt, /Connection, Session, Tab, Pane, Dashboard Widget Instance/);
  assert.match(prompt, /v0\.1\.31/);
  assert.match(prompt, /da94b9e/);
  assert.match(prompt, /GitHub generated notes/);
  assert.match(prompt, /Markdown only/);
  assert.match(prompt, /light IT humor/);
  assert.match(prompt, /English release notes first/);
  assert.match(prompt, /Traditional Chinese \(Taiwan\) version below/);
  assert.match(prompt, /same light humor and tone/);
});

test("composeFallbackReleaseNotes creates a publishable markdown changelog without AI", () => {
  const notes = composeFallbackReleaseNotes(sampleContext);

  assert.match(notes, /^# KKTerm v0\.1\.32/m);
  assert.match(notes, /## Highlights/);
  assert.match(notes, /## Changes/);
  assert.match(notes, /terminal recording controls/);
  assert.match(notes, /da94b9e/);
  assert.match(notes, /Compare: https:\/\/github\.com\/ryantsai\/KKTerm\/compare\/v0\.1\.31\.\.\.v0\.1\.32/);
});

test("prependDirectDownloads places Windows release links before generated notes", () => {
  const notes = prependDirectDownloads(sampleContext, "# KKTerm v0.1.32\n\n## Highlights\n\n- New release.\n");

  assert.match(notes, /^## Direct Downloads\n\* 💻 \[Download for Windows \(64-bit\)\]/);
  assert.match(
    notes,
    /https:\/\/github\.com\/ryantsai\/KKTerm\/releases\/download\/v0\.1\.32\/kkterm-0\.1\.32-windows-x64-setup\.exe/,
  );
  assert.match(
    notes,
    /https:\/\/github\.com\/ryantsai\/KKTerm\/releases\/download\/v0\.1\.32\/kkterm-0\.1\.32-windows-arm64-setup\.exe/,
  );
  assert.ok(notes.indexOf("## Direct Downloads") < notes.indexOf("# KKTerm v0.1.32"));
});

test("prependChangelogEntry inserts newest release below the changelog header", () => {
  const current = "# Changelog\n\nAll notable changes to KKTerm are documented here.\n\n## v0.1.31\n\n- Previous.\n";
  const entry = "# KKTerm v0.1.32\n\n## Highlights\n\n- New release.\n";

  const updated = prependChangelogEntry(current, entry);

  assert.match(updated, /^# Changelog\n\nAll notable changes to KKTerm are documented here\.\n\n## v0\.1\.32/m);
  assert.ok(updated.indexOf("## v0.1.32") < updated.indexOf("## v0.1.31"));
  assert.doesNotMatch(updated, /# KKTerm v0\.1\.32/);
});

test("prependChangelogEntry normalizes release heading after direct downloads", () => {
  const current = "# Changelog\n\nAll notable changes to KKTerm are documented here.\n\n## v0.1.31\n\n- Previous.\n";
  const entry = prependDirectDownloads(sampleContext, "# KKTerm v0.1.32\n\n## Highlights\n\n- New release.\n");

  const updated = prependChangelogEntry(current, entry);

  assert.match(updated, /^# Changelog\n\nAll notable changes to KKTerm are documented here\.\n\n## Direct Downloads/m);
  assert.match(updated, /## v0\.1\.32/);
  assert.doesNotMatch(updated, /# KKTerm v0\.1\.32/);
});
