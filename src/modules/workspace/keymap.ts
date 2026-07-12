// Workspace Module keyboard shortcut catalog and matching.
//
// Every rebindable action lives in WORKSPACE_SHORTCUT_ACTIONS with its default
// binding (or null for actions that ship unbound until the user assigns one in
// Settings → Shortcuts). User overrides are stored in
// `GeneralSettings.workspaceShortcuts` as an actionId → binding map where a
// null value means "explicitly unbound"; actions absent from the map keep
// their default. Defaults use Ctrl+Shift combinations (or Ctrl with keys no
// shell interprets) so terminal Sessions never lose plain Ctrl+letter input.
//
// Scopes: "workspace" actions are handled by a window-level capture listener
// while the Workspace Module is active; "terminal" actions are handled inside
// the focused terminal Pane's xterm.js custom key handler.

export type WorkspaceShortcutScope = "workspace" | "terminal";

export type WorkspaceShortcutActionId =
  | "newTab"
  | "closeTab"
  | "nextTab"
  | "previousTab"
  | "copy"
  | "paste"
  | "quickSelect"
  | "find"
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "splitRight"
  | "splitLeft"
  | "splitDown"
  | "splitUp";

export type WorkspaceShortcutOverrides = Record<string, string | null>;

export type WorkspaceShortcutAction = {
  id: WorkspaceShortcutActionId;
  scope: WorkspaceShortcutScope;
  labelKey: string;
  defaultBinding: string | null;
};

export const WORKSPACE_SHORTCUT_ACTIONS: readonly WorkspaceShortcutAction[] = [
  { id: "newTab", scope: "workspace", labelKey: "workspace.newTab", defaultBinding: "Ctrl+Shift+T" },
  { id: "closeTab", scope: "workspace", labelKey: "settings.shortcutCloseTab", defaultBinding: "Ctrl+Shift+W" },
  { id: "nextTab", scope: "workspace", labelKey: "settings.shortcutNextTab", defaultBinding: "Ctrl+Tab" },
  { id: "previousTab", scope: "workspace", labelKey: "settings.shortcutPreviousTab", defaultBinding: "Ctrl+Shift+Tab" },
  { id: "copy", scope: "terminal", labelKey: "terminal.copy", defaultBinding: "Ctrl+Shift+C" },
  { id: "paste", scope: "terminal", labelKey: "terminal.paste", defaultBinding: "Ctrl+V" },
  { id: "quickSelect", scope: "terminal", labelKey: "terminal.quickSelect", defaultBinding: "Ctrl+Shift+Space" },
  { id: "find", scope: "terminal", labelKey: "terminal.findInScrollback", defaultBinding: "Ctrl+Shift+F" },
  { id: "zoomIn", scope: "terminal", labelKey: "settings.shortcutZoomIn", defaultBinding: "Ctrl+=" },
  { id: "zoomOut", scope: "terminal", labelKey: "settings.shortcutZoomOut", defaultBinding: "Ctrl+-" },
  { id: "zoomReset", scope: "terminal", labelKey: "settings.shortcutZoomReset", defaultBinding: "Ctrl+0" },
  { id: "splitRight", scope: "terminal", labelKey: "terminal.splitRight", defaultBinding: null },
  { id: "splitLeft", scope: "terminal", labelKey: "terminal.splitLeft", defaultBinding: null },
  { id: "splitDown", scope: "terminal", labelKey: "terminal.splitDown", defaultBinding: null },
  { id: "splitUp", scope: "terminal", labelKey: "terminal.splitUp", defaultBinding: null },
];

const FIXED_TERMINAL_SHORTCUT_ALIASES: ReadonlyArray<{
  actionId: WorkspaceShortcutActionId;
  binding: string;
}> = [
  { actionId: "copy", binding: "Ctrl+Insert" },
  { actionId: "paste", binding: "Ctrl+Shift+V" },
];

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

/**
 * Normalize a keydown event into the canonical binding string, e.g.
 * "Ctrl+Shift+T". Returns null for presses that cannot be a shortcut: bare
 * modifiers, and keys without a Ctrl/Alt/Cmd modifier (except F1–F24), so
 * plain typing can never match or record a binding.
 */
export function bindingFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }
  const isFunctionKey = /^F([1-9]|1[0-9]|2[0-4])$/.test(event.key);
  if (!event.ctrlKey && !event.altKey && !event.metaKey && !isFunctionKey) {
    return null;
  }
  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.metaKey) {
    parts.push("Cmd");
  }
  parts.push(normalizeBindingKey(event.key));
  return parts.join("+");
}

function normalizeBindingKey(key: string): string {
  if (key === " " || key === "Spacebar") {
    return "Space";
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key;
}

/**
 * Effective binding per action after applying stored overrides. A null value
 * means the action is unbound.
 */
export function effectiveWorkspaceShortcutBindings(
  overrides: WorkspaceShortcutOverrides | undefined,
): Map<WorkspaceShortcutActionId, string | null> {
  const bindings = new Map<WorkspaceShortcutActionId, string | null>();
  for (const action of WORKSPACE_SHORTCUT_ACTIONS) {
    const override = overrides?.[action.id];
    bindings.set(action.id, override !== undefined ? override : action.defaultBinding);
  }
  return bindings;
}

/**
 * Resolve a keydown event to the Workspace shortcut action bound to it, if
 * any, restricted to one scope. When stored overrides collide, the first
 * action in catalog order wins so a bad settings payload cannot make one key
 * fire twice.
 */
export function workspaceShortcutFromKeyboardEvent(
  event: KeyboardEvent,
  overrides: WorkspaceShortcutOverrides | undefined,
  scope: WorkspaceShortcutScope,
): WorkspaceShortcutActionId | null {
  const binding = bindingFromKeyboardEvent(event);
  if (!binding) {
    return null;
  }
  const bindings = effectiveWorkspaceShortcutBindings(overrides);
  for (const action of WORKSPACE_SHORTCUT_ACTIONS) {
    if (action.scope === scope && bindings.get(action.id) === binding) {
      return action.id;
    }
  }
  return null;
}

/**
 * Resolve conventional terminal aliases that remain active independently of
 * the user's configurable primary bindings.
 */
export function fixedTerminalShortcutFromKeyboardEvent(
  event: KeyboardEvent,
): WorkspaceShortcutActionId | null {
  const binding = bindingFromKeyboardEvent(event);
  if (!binding) {
    return null;
  }
  return FIXED_TERMINAL_SHORTCUT_ALIASES.find((alias) => alias.binding === binding)?.actionId ?? null;
}

/**
 * Find the other action already using `binding`, for conflict rejection in
 * the Settings recorder. Shortcuts share one namespace across both scopes
 * because terminal-focused keys reach the window listener too.
 */
export function conflictingWorkspaceShortcutAction(
  binding: string,
  overrides: WorkspaceShortcutOverrides | undefined,
  exceptActionId: WorkspaceShortcutActionId,
): WorkspaceShortcutAction | null {
  const fixedAlias = FIXED_TERMINAL_SHORTCUT_ALIASES.find(
    (alias) => alias.actionId !== exceptActionId && alias.binding === binding,
  );
  if (fixedAlias) {
    return WORKSPACE_SHORTCUT_ACTIONS.find((action) => action.id === fixedAlias.actionId) ?? null;
  }
  const bindings = effectiveWorkspaceShortcutBindings(overrides);
  for (const action of WORKSPACE_SHORTCUT_ACTIONS) {
    if (action.id !== exceptActionId && bindings.get(action.id) === binding) {
      return action;
    }
  }
  return null;
}
