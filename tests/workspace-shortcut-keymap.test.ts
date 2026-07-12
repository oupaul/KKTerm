import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKSPACE_SHORTCUT_ACTIONS,
  bindingFromKeyboardEvent,
  conflictingWorkspaceShortcutAction,
  effectiveWorkspaceShortcutBindings,
  fixedTerminalShortcutFromKeyboardEvent,
  workspaceShortcutFromKeyboardEvent,
} from "../src/modules/workspace/keymap";

// Minimal KeyboardEvent stand-in; the keymap only reads these fields.
function keyEvent(
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, "ctrlKey" | "shiftKey" | "altKey" | "metaKey">> = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

test("bindingFromKeyboardEvent canonicalizes modifier order and key casing", () => {
  assert.equal(
    bindingFromKeyboardEvent(keyEvent("t", { ctrlKey: true, shiftKey: true })),
    "Ctrl+Shift+T",
  );
  assert.equal(bindingFromKeyboardEvent(keyEvent(" ", { ctrlKey: true, shiftKey: true })), "Ctrl+Shift+Space");
  assert.equal(bindingFromKeyboardEvent(keyEvent("Tab", { ctrlKey: true })), "Ctrl+Tab");
});

test("bindingFromKeyboardEvent ignores bare keys and lone modifiers", () => {
  // Plain typing must never resolve to a binding, or terminals would break.
  assert.equal(bindingFromKeyboardEvent(keyEvent("a")), null);
  assert.equal(bindingFromKeyboardEvent(keyEvent("Control", { ctrlKey: true })), null);
  assert.equal(bindingFromKeyboardEvent(keyEvent("Shift", { shiftKey: true })), null);
  // Function keys are allowed without a modifier.
  assert.equal(bindingFromKeyboardEvent(keyEvent("F5")), "F5");
});

test("workspaceShortcutFromKeyboardEvent resolves defaults within the requested scope", () => {
  // New tab is a workspace-scope action; it must not resolve in terminal scope.
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("t", { ctrlKey: true, shiftKey: true }), {}, "workspace"),
    "newTab",
  );
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("t", { ctrlKey: true, shiftKey: true }), {}, "terminal"),
    null,
  );
  // Copy is terminal-scope.
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("c", { ctrlKey: true, shiftKey: true }), {}, "terminal"),
    "copy",
  );
});

test("overrides rebind and unbind actions", () => {
  const overrides = { newTab: "Ctrl+Shift+N", closeTab: null } as Record<string, string | null>;
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("n", { ctrlKey: true, shiftKey: true }), overrides, "workspace"),
    "newTab",
  );
  // The old default no longer fires once rebound.
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("t", { ctrlKey: true, shiftKey: true }), overrides, "workspace"),
    null,
  );
  // Explicitly unbound action produces no match on its former default.
  assert.equal(
    workspaceShortcutFromKeyboardEvent(keyEvent("w", { ctrlKey: true, shiftKey: true }), overrides, "workspace"),
    null,
  );
});

test("split actions ship unbound by default", () => {
  const bindings = effectiveWorkspaceShortcutBindings({});
  assert.equal(bindings.get("splitRight"), null);
  assert.equal(bindings.get("splitLeft"), null);
});

test("conflict detection finds the action already using a binding", () => {
  // Ctrl+Shift+C is copy's default; assigning it to find must report the conflict.
  const conflict = conflictingWorkspaceShortcutAction("Ctrl+Shift+C", {}, "find");
  assert.equal(conflict?.id, "copy");
  // No conflict against an unused combination.
  assert.equal(conflictingWorkspaceShortcutAction("Ctrl+Shift+J", {}, "find"), null);
});

test("fixed terminal aliases cannot be stolen by other configurable actions", () => {
  assert.equal(
    fixedTerminalShortcutFromKeyboardEvent(keyEvent("Insert", { ctrlKey: true })),
    "copy",
  );
  assert.equal(
    fixedTerminalShortcutFromKeyboardEvent(keyEvent("v", { ctrlKey: true, shiftKey: true })),
    "paste",
  );
  assert.equal(conflictingWorkspaceShortcutAction("Ctrl+Insert", {}, "find")?.id, "copy");
  assert.equal(conflictingWorkspaceShortcutAction("Ctrl+Shift+V", {}, "find")?.id, "paste");
  assert.equal(conflictingWorkspaceShortcutAction("Ctrl+Insert", {}, "copy"), null);
  assert.equal(conflictingWorkspaceShortcutAction("Ctrl+Shift+V", {}, "paste"), null);
});

test("every action has a unique default binding or is unbound", () => {
  const seen = new Set<string>();
  for (const action of WORKSPACE_SHORTCUT_ACTIONS) {
    if (action.defaultBinding === null) {
      continue;
    }
    assert.ok(!seen.has(action.defaultBinding), `duplicate default binding ${action.defaultBinding}`);
    seen.add(action.defaultBinding);
  }
});
