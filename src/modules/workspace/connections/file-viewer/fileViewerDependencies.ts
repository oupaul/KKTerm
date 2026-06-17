/**
 * Phase 2: viewer modes that render through an external dependency downloaded at
 * runtime rather than bundled into the app. Each entry maps a viewer kind to the
 * Installer Helper recipe id that provides it, so the viewer can detect the
 * dependency and offer an in-context install instead of failing.
 */
import type { ViewerKind } from "./fileViewerModel";

export interface ViewerDependency {
  /** Installer Helper catalog recipe id (kept in sync with the Rust constant). */
  toolId: string;
  /** i18n key for the dependency's display name. */
  toolNameKey: string;
}

export function dependencyForKind(kind: ViewerKind): ViewerDependency | null {
  if (kind === "pdf") {
    return { toolId: "poppler", toolNameKey: "workspace.fileViewer.dep.poppler" };
  }
  return null;
}
