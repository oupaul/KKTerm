import { readdir, readFile } from "node:fs/promises";

const files = {
  agents: "AGENTS.md",
  architecture: "docs/ARCHITECTURE.md",
  aiTool: "src-tauri/src/ai.rs",
  navigationModel: "src/app/tutorialNavigationModel.ts",
};

const [agents, architecture, aiTool, navigationModel] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

const uiFiles = await sourceFiles("src");
const manualFiles = await sourceFiles("docs/manual", /\.(md)$/);

const uiSources = await Promise.all(uiFiles.map((file) => readFile(file, "utf8")));
const manualSources = await Promise.all(manualFiles.map((file) => readFile(file, "utf8")));
const manual = manualSources.join("\n");

const anchorIds = new Set(
  uiSources.flatMap((source) =>
    [
      ...source.matchAll(/data-tutorial-id=["']([^"']+)["']/g),
      ...source.matchAll(/dataTutorialId=["']([^"']+)["']/g),
      ...Array.from(source.matchAll(/data-tutorial-id=\{([^}]+)\}/g)).flatMap((match) =>
        [...match[1].matchAll(/["']([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9.-]+)["']/g)],
      ),
    ].map((match) => match[1]),
  ),
);

const mappedIds = new Set(
  [
    ...navigationModel.matchAll(/["']([a-zA-Z0-9.-]+)["']:\s*\{\s*page:/g),
    ...navigationModel.matchAll(/["']([a-zA-Z0-9.-]+)["']:\s*["'][a-z-]+["']/g),
    ...navigationModel.matchAll(/["']([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9.-]+)["']/g),
  ].map((match) => match[1]),
);

for (const targetId of anchorIds) {
  if (!mappedIds.has(targetId)) {
    throw new Error(`${targetId} has a data-tutorial-id anchor but no tutorial navigation mapping.`);
  }
  if (!aiTool.includes(targetId)) {
    throw new Error(`${targetId} is mapped in the UI but missing from tutorial_highlight tool metadata.`);
  }
  if (!manual.includes(targetId)) {
    throw new Error(`${targetId} is mapped in the UI but missing from docs/manual AI grep hints.`);
  }
}

for (const targetId of mappedIds) {
  if (!anchorIds.has(targetId)) {
    throw new Error(`${targetId} has tutorial navigation but no data-tutorial-id anchor.`);
  }
}

const requiredDocs = [
  [files.agents, agents],
  [files.architecture, architecture],
];

for (const [file, source] of requiredDocs) {
  for (const phrase of ["data-tutorial-id", "tutorialNavigationModel.ts", "tutorial_highlight"]) {
    if (!source.includes(phrase)) {
      throw new Error(`${file} must document ${phrase} for tutorial navigation changes.`);
    }
  }
}

async function sourceFiles(directory, pattern = /\.(tsx|ts)$/) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        return sourceFiles(path, pattern);
      }
      if (pattern.test(entry.name) && !entry.name.endsWith(".test.ts")) {
        return [path];
      }
      return [];
    }),
  );
  return files.flat();
}
