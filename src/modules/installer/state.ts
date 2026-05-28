// In-memory session state for the Installer Helper Module.
//
// Per ADR 0007 / Q13b: detection is never persisted across restarts. The
// store auto-scans on first Module entry per app session and holds results
// until the user clicks Refresh or quits the app. Catalog is cached on
// disk by the Rust side; the store just mirrors the last-loaded copy.
//
// This module owns two parallel transient slices:
//   * inFlight — the legacy current-step + log view used by tile status
//     dots and the back-compat path for providers that have not yet been
//     migrated to the declared-plan stepper protocol.
//   * stepperState — the n8n-style stepper view: declared plan, per-step
//     status, per-step logs, per-step durations and errors. Populated from
//     `plan` / `stepStarted` / `stepFinished` events; stdout/stderr lines
//     get routed to the active step when they carry a stepId, otherwise to
//     a synthetic "_general" bucket that the stepper renders as raw output
//     above the plan rows.

import { create } from "zustand";
import type {
  Catalog,
  DetectedState,
  PlanStep,
  ProgressEvent,
  ToolState,
} from "./types";

const MAX_LOG_LINES = 200;
const MAX_STEP_LOG_LINES = 500;
const GENERAL_STEP_BUCKET = "_general";

interface InFlight {
  /// "install" or "uninstall"
  operation: "install" | "uninstall";
  currentStep: string | null;
  ratio: number | null;
  log: string[];
}

type StepStatus = "pending" | "running" | "done" | "failed";

interface StepperState {
  plan: PlanStep[];
  status: Record<string, StepStatus>;
  startedAt: Record<string, number>;
  durations: Record<string, number>;
  errors: Record<string, string>;
  logs: Record<string, string[]>;
  activeStepId: string | null;
  startedAtMs: number;
}

interface OpenDialog {
  toolId: string;
  /// "info" — installed/not-installed details. "stepper" — install in
  /// progress or just completed; the dialog body renders the stepper.
  mode: "info" | "stepper";
}

interface InstallerStoreState {
  catalog: Catalog | null;
  detected: Record<string, DetectedState>;
  toolState: Record<string, ToolState>;
  hasInitialScanned: boolean;
  scanning: boolean;
  /// True for the duration of a streaming check-for-updates sweep.
  checking: boolean;
  /// Optional per-tool error from the most recent check sweep (null when
  /// the latest lookup succeeded).
  checkError: Record<string, string | null>;
  inFlight: Record<string, InFlight>;
  /// Per-tool stepper state, parallel to `inFlight`. Retained across
  /// dialog open/close so reopening an in-flight install shows current
  /// progress, and so a just-completed stepper can be reviewed.
  stepperState: Record<string, StepperState>;
  /// Terminal status echo for the most recent operation per tool.
  /// `null` means no recent status.
  lastStatus: Record<
    string,
    | { kind: "completed"; installedVersion: string | null }
    | { kind: "failed"; message: string }
    | { kind: "cancelled" }
    | null
  >;
  /// Tool whose detail dialog is currently open, plus dialog mode. The
  /// dialog reads detected/toolState/stepperState from the store, so it
  /// can be closed and reopened without losing in-flight progress.
  openDialog: OpenDialog | null;
  /// Set to `true` for the rest of the app session once any WSL feature
  /// install completes. Docker (and anything else that `needsWsl`) is then
  /// disabled with a reboot-required hint until the user restarts Windows.
  /// Reset only by restarting KKTerm — a real reboot kills the app anyway.
  wslJustEnabled: boolean;

  setCatalog: (catalog: Catalog) => void;
  setDetected: (detected: Record<string, DetectedState>) => void;
  setOneDetected: (toolId: string, state: DetectedState) => void;
  setToolStates: (states: ToolState[]) => void;
  beginInFlight: (toolId: string, operation: "install" | "uninstall") => void;
  applyProgress: (event: ProgressEvent) => void;
  openInfoDialog: (toolId: string) => void;
  openStepperDialog: (toolId: string) => void;
  closeDialog: () => void;
  setScanning: (scanning: boolean) => void;
  setChecking: (checking: boolean) => void;
  markInitialScanned: () => void;
  markWslJustEnabled: () => void;
  reset: () => void;
}

const initial: Pick<
  InstallerStoreState,
  | "catalog"
  | "detected"
  | "toolState"
  | "hasInitialScanned"
  | "scanning"
  | "checking"
  | "checkError"
  | "inFlight"
  | "stepperState"
  | "lastStatus"
  | "openDialog"
  | "wslJustEnabled"
> = {
  catalog: null,
  detected: {},
  toolState: {},
  hasInitialScanned: false,
  scanning: false,
  checking: false,
  checkError: {},
  inFlight: {},
  stepperState: {},
  lastStatus: {},
  openDialog: null,
  wslJustEnabled: false,
};

export const useInstallerStore = create<InstallerStoreState>((set) => ({
  ...initial,
  setCatalog: (catalog) => set({ catalog }),
  setDetected: (detected) => set({ detected }),
  setOneDetected: (toolId, state) =>
    set((s) => ({ detected: { ...s.detected, [toolId]: state } })),
  setToolStates: (states) =>
    set({
      toolState: Object.fromEntries(states.map((s) => [s.toolId, s])),
    }),
  beginInFlight: (toolId, operation) =>
    set((s) => ({
      inFlight: {
        ...s.inFlight,
        [toolId]: { operation, currentStep: null, ratio: null, log: [] },
      },
      stepperState: {
        ...s.stepperState,
        // Fresh stepper slate for this install; an immediate `plan` event
        // will fill it in. Pre-seeded so the stepper UI has something to
        // render even before the first plan event lands.
        [toolId]: {
          plan: [],
          status: {},
          startedAt: {},
          durations: {},
          errors: {},
          logs: {},
          activeStepId: null,
          startedAtMs: Date.now(),
        },
      },
      lastStatus: { ...s.lastStatus, [toolId]: null },
    })),
  applyProgress: (event) =>
    set((s) => {
      // ---- check-for-updates protocol --------------------------------
      if (event.kind === "checkStarted") {
        const cleared: Record<string, string | null> = {};
        for (const id of event.toolIds) cleared[id] = null;
        return {
          checking: true,
          checkError: { ...s.checkError, ...cleared },
        };
      }
      if (event.kind === "checkResult") {
        const nextToolState = { ...s.toolState };
        const existing = nextToolState[event.toolId];
        nextToolState[event.toolId] = {
          toolId: event.toolId,
          pinned: existing?.pinned ?? false,
          latestVersionSeen:
            event.latestVersion ?? existing?.latestVersionSeen ?? null,
          lastCheckAt: Math.floor(Date.now() / 1000),
        };
        return {
          toolState: nextToolState,
          checkError: {
            ...s.checkError,
            [event.toolId]: event.error ?? null,
          },
        };
      }
      if (event.kind === "checkFinished") {
        return { checking: false };
      }

      // ---- install/uninstall events ---------------------------------
      const toolId = "toolId" in event ? event.toolId : null;
      if (!toolId) return s;

      // Stepper protocol events first; they may exist even when inFlight
      // has not been seeded yet (e.g. plan arrives before beginInFlight
      // commits, though current code paths set beginInFlight first).
      if (event.kind === "plan") {
        const seeded: StepperState = {
          plan: event.steps,
          status: Object.fromEntries(
            event.steps.map((step) => [step.id, "pending" as StepStatus]),
          ),
          startedAt: {},
          durations: {},
          errors: {},
          logs: {},
          activeStepId: null,
          startedAtMs: s.stepperState[toolId]?.startedAtMs ?? Date.now(),
        };
        return {
          stepperState: { ...s.stepperState, [toolId]: seeded },
        };
      }
      if (event.kind === "stepStarted") {
        const current =
          s.stepperState[toolId] ?? emptyStepperState();
        const status = { ...current.status, [event.stepId]: "running" as StepStatus };
        const startedAt = { ...current.startedAt, [event.stepId]: Date.now() };
        return {
          stepperState: {
            ...s.stepperState,
            [toolId]: {
              ...current,
              status,
              startedAt,
              activeStepId: event.stepId,
            },
          },
        };
      }
      if (event.kind === "stepFinished") {
        const current =
          s.stepperState[toolId] ?? emptyStepperState();
        const startedAt = current.startedAt[event.stepId] ?? Date.now();
        const status: StepStatus = event.ok ? "done" : "failed";
        return {
          stepperState: {
            ...s.stepperState,
            [toolId]: {
              ...current,
              status: { ...current.status, [event.stepId]: status },
              durations: {
                ...current.durations,
                [event.stepId]: Date.now() - startedAt,
              },
              errors: event.error
                ? { ...current.errors, [event.stepId]: event.error }
                : current.errors,
              activeStepId:
                current.activeStepId === event.stepId
                  ? null
                  : current.activeStepId,
            },
          },
        };
      }

      // Legacy inFlight slice — only updated when an install is in flight.
      const current = s.inFlight[toolId];
      const stepperCurrent = s.stepperState[toolId];

      if (event.kind === "step") {
        if (!current) return s;
        return {
          inFlight: {
            ...s.inFlight,
            [toolId]: {
              ...current,
              currentStep: event.message,
              log: trimLog([...current.log, `▸ ${event.message}`]),
            },
          },
        };
      }
      if (event.kind === "stdout" || event.kind === "stderr") {
        const nextStepper = stepperCurrent
          ? withStepLog(stepperCurrent, event.stepId, event.line)
          : stepperCurrent;
        if (!current) {
          return nextStepper
            ? { stepperState: { ...s.stepperState, [toolId]: nextStepper } }
            : s;
        }
        return {
          inFlight: {
            ...s.inFlight,
            [toolId]: {
              ...current,
              log: trimLog([...current.log, event.line]),
            },
          },
          ...(nextStepper
            ? { stepperState: { ...s.stepperState, [toolId]: nextStepper } }
            : {}),
        };
      }
      if (event.kind === "progress") {
        if (!current) return s;
        return {
          inFlight: {
            ...s.inFlight,
            [toolId]: { ...current, ratio: event.ratio },
          },
        };
      }

      // Terminal events: drop in-flight, record lastStatus. Stepper state
      // stays around so the user can review what just happened.
      const { [toolId]: _gone, ...restInFlight } = s.inFlight;
      const lastStatus: InstallerStoreState["lastStatus"][string] =
        event.kind === "completed"
          ? { kind: "completed", installedVersion: event.installedVersion }
          : event.kind === "failed"
            ? { kind: "failed", message: event.message }
            : { kind: "cancelled" };
      return {
        inFlight: restInFlight,
        lastStatus: { ...s.lastStatus, [toolId]: lastStatus },
      };
    }),
  openInfoDialog: (toolId) => set({ openDialog: { toolId, mode: "info" } }),
  openStepperDialog: (toolId) =>
    set({ openDialog: { toolId, mode: "stepper" } }),
  closeDialog: () => set({ openDialog: null }),
  setScanning: (scanning) => set({ scanning }),
  setChecking: (checking) => set({ checking }),
  markInitialScanned: () => set({ hasInitialScanned: true }),
  markWslJustEnabled: () => set({ wslJustEnabled: true }),
  reset: () => set(initial),
}));

function emptyStepperState(): StepperState {
  return {
    plan: [],
    status: {},
    startedAt: {},
    durations: {},
    errors: {},
    logs: {},
    activeStepId: null,
    startedAtMs: Date.now(),
  };
}

function withStepLog(
  current: StepperState,
  stepId: string | undefined,
  line: string,
): StepperState {
  const bucket = stepId ?? current.activeStepId ?? GENERAL_STEP_BUCKET;
  const prev = current.logs[bucket] ?? [];
  const next = prev.length >= MAX_STEP_LOG_LINES
    ? [...prev.slice(prev.length - MAX_STEP_LOG_LINES + 1), line]
    : [...prev, line];
  return { ...current, logs: { ...current.logs, [bucket]: next } };
}

function trimLog(lines: string[]): string[] {
  if (lines.length <= MAX_LOG_LINES) return lines;
  return lines.slice(lines.length - MAX_LOG_LINES);
}

export { GENERAL_STEP_BUCKET };
export type { InstallerStoreState, StepperState, StepStatus };
