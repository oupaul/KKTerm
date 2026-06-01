// Frontend intervention sub-turn runner.
//
// When Rust fires a `watchdog://event { kind: "intervene" }`, the watchdog
// store calls `runIntervention()` here. The runner builds an isolated
// AI request, awaits the response, and posts the outcome back to Rust via
// `watchdog_record_intervention`.
//
// The sub-turn is tool-using: the AI sees the snapshot + goal and may call the
// watchdog's allowedTools. The Rust agent loop executes those tools (restricted
// to allowedTools and pre-approved via the sessionAllow policy approved at
// watchdog creation), then returns the final assistant text.

import { invoke } from "@tauri-apps/api/core";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import type {
  WatchdogIntervenePayload,
  WatchdogInterventionRecord,
} from "./types";

/// Soft cap on how long the frontend will wait for the AI response before
/// giving up and recording an error. Stays below the Rust-side
/// INTERVENTION_TIMEOUT_MS (5 min) so the Rust side never times out first.
const INTERVENTION_SOFT_TIMEOUT_MS = 4 * 60 * 1000;

interface RunIntervention {
  watchdogId: string;
  watchdogName: string;
  payload: WatchdogIntervenePayload;
}

export async function runIntervention({
  watchdogId,
  watchdogName,
  payload,
}: RunIntervention): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const startedAt = Date.now();
  let record: WatchdogInterventionRecord;

  try {
    const aiResponse = await Promise.race<AiAgentResponse>([
      invokeAiTurn(watchdogId, watchdogName, payload),
      timeoutPromise<AiAgentResponse>(INTERVENTION_SOFT_TIMEOUT_MS),
    ]);
    record = {
      interventionId: payload.interventionId,
      at: Date.now(),
      ok: true,
      summary: summarizeAiResponse(aiResponse),
      // Tool-using sub-turns land later; for now the sub-turn is text-only,
      // so no tools were called.
      toolCalls: [],
      completionReason: detectCompletionReason(aiResponse, payload.goal),
    };
  } catch (error) {
    record = {
      interventionId: payload.interventionId,
      at: Date.now(),
      ok: false,
      summary: "Intervention failed.",
      toolCalls: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Always record — even on failure. The Rust state machine needs the
  // signal to unpark the poll loop.
  try {
    await invokeCommand("watchdog_record_intervention", {
      id: watchdogId,
      record,
    });
  } catch (error) {
    // If recording itself fails, the Rust loop will time out and finalize
    // the watchdog with an error state — safe failure.
    console.error("[watchdog] failed to record intervention", error, {
      durationMs: Date.now() - startedAt,
    });
  }
}

/// Build and send the isolated AI request. Uses the existing `run_ai_agent`
/// command, but constructs the request such that the AI sees a fresh
/// context (no chat history) anchored on the watchdog goal + snapshot.
async function invokeAiTurn(
  watchdogId: string,
  watchdogName: string,
  payload: WatchdogIntervenePayload,
): Promise<AiAgentResponse> {
  const systemContext = buildSystemContext(watchdogName, payload);
  const prompt = buildPrompt(payload);

  // `run_ai_agent` is not in the typed CommandMap; using raw invoke keeps
  // this module decoupled from the assistant's full request type surface.
  const response = await invoke<AiAgentResponse>("run_ai_agent", {
    request: {
      prompt,
      contextLabel: `watchdog:${watchdogId}`,
      // 'chat' intent — we deliberately do NOT use 'watchdog' here because
      // that mode is for *creating* watchdogs, not running interventions.
      intent: "chat",
      // Enable tools, but restrict them to the watchdog's allowedTools. The
      // backend narrows the tool catalog to exactly this list and treats the
      // listed tools as pre-approved (approved once at watchdog creation), so
      // the unattended sub-turn can act without an approval modal.
      allowTools: true,
      allowedTools: payload.allowedTools,
      messages: [],
      systemContext,
    },
  });
  return response;
}

interface AiAgentResponse {
  providerKind: string;
  model: string;
  content: string;
  reasoningContent?: string;
}

function buildSystemContext(
  watchdogName: string,
  payload: WatchdogIntervenePayload,
): string {
  // Compact, narrow — the model receives this as additional context after
  // the standard assistant system prompt. Constraints first, then goal.
  return [
    `WATCHDOG INTERVENTION SUB-TURN.`,
    `Watchdog: "${watchdogName}" (id: hidden).`,
    `You are responding to a triggered watchdog. This is NOT a chat with the user — it is an automated, unattended intervention. Nobody is watching to answer questions.`,
    `Hard rules: act, don't ask. Do the minimum needed to advance the goal, then stop. Use ONLY the allowed tools below — no others are available.`,
    `If you need a target pane or session id, call session_state first to discover it, then act. Keep any text you send to a terminal minimal and safe.`,
    `When you are done, write a brief (1–2 sentence) summary of what you did.`,
    `If the situation is fully resolved (job finished, error cleared, nothing left to do), include the literal phrase "WATCHDOG_DONE" in your summary so the watchdog can stop.`,
    `Goal: ${payload.goal}`,
    `Allowed tools: ${payload.allowedTools.join(", ") || "(none)"}.`,
  ].join("\n");
}

function buildPrompt(payload: WatchdogIntervenePayload): string {
  return [
    "The watchdog trigger fired. Examine the snapshot and respond per the rules above.",
    "",
    "SNAPSHOT:",
    "```json",
    JSON.stringify(payload.snapshot, null, 2),
    "```",
  ].join("\n");
}

function summarizeAiResponse(response: AiAgentResponse): string {
  const text = response.content?.trim() ?? "";
  if (!text) {
    return "(AI returned empty response)";
  }
  // Strip the WATCHDOG_DONE sentinel from the human-readable summary.
  const cleaned = text.replace(/\bWATCHDOG_DONE\b/g, "").trim();
  if (cleaned.length <= 200) {
    return cleaned;
  }
  return cleaned.slice(0, 197) + "…";
}

/// Detect the AI's explicit completion signal. Returns the goal string as
/// the completion reason when present — concise enough for the report.
function detectCompletionReason(
  response: AiAgentResponse,
  goal: string,
): string | undefined {
  if (/\bWATCHDOG_DONE\b/.test(response.content ?? "")) {
    return `AI declared task complete: ${goal.slice(0, 80)}`;
  }
  return undefined;
}

function timeoutPromise<T>(ms: number): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`intervention timed out after ${ms}ms`)), ms),
  );
}
