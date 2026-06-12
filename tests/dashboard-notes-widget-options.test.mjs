import { readFileSync } from "node:fs";

const notesSource = readFileSync("src/modules/dashboard/widgets/builtin/notes/NotesWidget.tsx", "utf8");
const customizeSource = readFileSync("src/modules/dashboard/edit/CustomizePopover.tsx", "utf8");
const catalogSource = readFileSync("src/modules/dashboard/edit/CatalogOverlay.tsx", "utf8");

for (const key of ["markdownEnabled", "foldCorner"]) {
  if (!notesSource.includes(key)) {
    throw new Error(`Notes widget settings should include ${key}.`);
  }
}

for (const corner of ["topRight", "topLeft", "bottomRight", "bottomLeft"]) {
  if (!notesSource.includes(`"${corner}"`)) {
    throw new Error(`Notes widget should support ${corner} folded-corner placement.`);
  }
}

if (!notesSource.includes("DOMPurify.sanitize") || !notesSource.includes("marked.parse")) {
  throw new Error("Notes markdown preview should render sanitized marked output.");
}

if (!notesSource.includes("markdownEnabled: true")) {
  throw new Error("Notes markdown rendering should default on.");
}

if (notesSource.includes("event.preventDefault();\n            setIsEditingMarkdown(true);")) {
  throw new Error("Notes markdown preview should not prevent the default mouse action because that blocks text selection and the native Copy context menu.");
}

if (!notesSource.includes("event.button !== 0") || !notesSource.includes("window.getSelection()?.toString()")) {
  throw new Error("Notes markdown preview should enter edit mode only for plain left clicks without an active text selection.");
}

if (!notesSource.includes("showNativeContextMenu") || !notesSource.includes('label: t("common.copy")')) {
  throw new Error("Notes selected text should expose a native Copy context-menu item.");
}

if (!customizeSource.includes("dashboard.notesMarkdownEnabled")) {
  throw new Error("Notes widget options should expose a markdown toggle.");
}

if (!customizeSource.includes("dashboard.notesFoldCorner")) {
  throw new Error("Notes widget options should expose folded-corner placement.");
}

if (!catalogSource.includes("randomNotesSettings()")) {
  throw new Error("New Notes widget instances should receive randomized note settings on creation.");
}
