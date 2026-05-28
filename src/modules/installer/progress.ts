import { listen } from "@tauri-apps/api/event";
import { invokeCommand } from "../../lib/tauri";
import {
  PROGRESS_EVENT_NAME,
  type InstallOptions,
  type ProgressEvent,
} from "./types";

export type TerminalProgressEvent = Extract<
  ProgressEvent,
  { kind: "completed" | "failed" | "cancelled" }
>;

export function isTerminalProgressEvent(
  event: ProgressEvent,
): event is TerminalProgressEvent {
  return (
    event.kind === "completed" ||
    event.kind === "failed" ||
    event.kind === "cancelled"
  );
}

export async function installRecipeAndWait(
  toolId: string,
  options?: InstallOptions,
): Promise<TerminalProgressEvent> {
  const waiter = waitForTerminalProgress(toolId);
  await waiter.ready;
  try {
    await invokeCommand("installer_install_recipe", { toolId, options });
  } catch (error) {
    waiter.cancel();
    throw error;
  }
  return waiter.done;
}

function waitForTerminalProgress(toolId: string) {
  let unlisten: (() => void) | undefined;
  let resolveTerminalEvent!: (event: TerminalProgressEvent) => void;
  const done = new Promise<TerminalProgressEvent>((resolve) => {
    resolveTerminalEvent = resolve;
  });
  const ready = listen<ProgressEvent>(PROGRESS_EVENT_NAME, (event) => {
    const payload = event.payload;
    if (!isTerminalProgressEvent(payload)) return;
    if (payload.toolId !== toolId) return;
    unlisten?.();
    resolveTerminalEvent(payload);
  }).then((u) => {
    unlisten = u;
  });
  return {
    ready,
    done,
    cancel: () => unlisten?.(),
  };
}
