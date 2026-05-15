import type { AppLauncherEntry } from "../types";
import { reorderAppLauncherEntries } from "./storage";

const now = "2026-05-15T00:00:00.000Z";
const entries: AppLauncherEntry[] = ["alpha", "bravo", "charlie"].map((name) => ({
  id: name,
  name,
  path: `C:\\Tools\\${name}.exe`,
  arguments: null,
  workingDirectory: null,
  iconDataUrl: null,
  railPinned: false,
  createdAt: now,
  updatedAt: now,
}));

const reordered = reorderAppLauncherEntries(entries, "charlie", "alpha");

if (reordered.map((entry) => entry.id).join(",") !== "charlie,alpha,bravo") {
  throw new Error("App Launcher entries should move before the drop target.");
}

const movedToEnd = reorderAppLauncherEntries(entries, "alpha", "charlie", "after");

if (movedToEnd.map((entry) => entry.id).join(",") !== "bravo,charlie,alpha") {
  throw new Error("App Launcher entries should move after the drop target.");
}

if (reorderAppLauncherEntries(entries, "alpha", "alpha") !== entries) {
  throw new Error("Dropping an entry onto itself should keep the same array.");
}
