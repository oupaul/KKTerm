---
name: desktop-accessibility-ui
description: Review KKTerm UI and Dashboard widgets for accessible desktop usability, contrast, focus, keyboard behavior, readable text, motion restraint, and non-color status cues.
---

# Desktop Accessibility UI

Use this skill when creating or reviewing KKTerm UI, especially Dashboard widgets, dialogs, controls, status panels, and dense desktop utility surfaces. Pair it with widget skills when the request includes visual design or widget creation.

## Accessibility Workflow

1. Identify who must use the interface and what action or information matters most.
2. Check readability before decoration: text size, contrast, spacing, and label clarity.
3. Ensure keyboard and pointer users can both complete the task.
4. Make status understandable without color alone.
5. Keep motion helpful, optional-looking, and bounded.
6. Review final output for focus traps, tiny controls, ambiguous icons, and missing state text.

## Readability

- Use short labels and plain operational language.
- Keep critical values and errors large enough to read at Dashboard widget size.
- Avoid placing important text over busy gradients or images.
- Maintain clear contrast in light and dark themes.
- Prefer stable layout over text that jumps during refresh.

## Focus and Interaction

- Interactive controls need visible focus styling.
- Do not create hover-only actions for essential behavior.
- Keep click targets large enough for desktop pointer use.
- Put destructive actions away from routine actions and label them clearly.
- Provide a visible retry or recovery action when data fetches fail.

## Status and Feedback

- Pair color with text, shape, icon, or position.
- Distinguish healthy, warning, critical, unknown, loading, and stale states.
- Do not report success while an async operation is still pending.
- Keep transient feedback concise and close to the affected control or data.

## Motion and Animation

- Avoid continuous decorative animation in utility widgets.
- Stop requestAnimationFrame loops when animation is complete or not needed.
- Keep attention-grabbing motion for meaningful changes only.
- Avoid flashing and rapid color cycling.

## KKTerm Boundaries

- Do not replace app-owned dialogs with browser alert, confirm, or prompt calls.
- Do not add one-off toast systems; user-facing transient status belongs in KKTerm's established status patterns.
- Do not duplicate Dashboard widget chrome inside script widgets.
- Preserve translated or non-English user-visible text exactly when editing existing code.

## Review Checklist

Before finalizing UI or widget code, verify:

- Important information is readable without zooming.
- Each interactive element has text, a title, or a clear accessible name.
- Keyboard focus is visible where custom controls are used.
- Color is not the only signal.
- Loading, empty, error, and stale states are understandable.
- Motion is bounded and not required for comprehension.
