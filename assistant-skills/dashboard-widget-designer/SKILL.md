---
name: dashboard-widget-designer
description: Improve KKTerm Dashboard AI Created Widget visual design, layout hierarchy, desktop utility polish, design-system consistency, compact states, and redesign critique.
---

# Dashboard Widget Designer

Use this skill when the user asks for a better-looking, more usable, or more polished Dashboard AI Created Widget or Dashboard view. Pair it with `dashboard-widget-builder` when code must be created or patched.

This skill adapts open-design-style practice for KKTerm: choose a clear artifact role, apply a small design system consistently, critique the result before delivery, and keep the artifact runnable inside its sandbox.

## Design Workflow

1. Identify the widget's job: monitor, launcher, calculator, timeline, command helper, map, chart, status panel, game, or focused utility.
2. Define a compact visual direction before writing or changing code: calm utility, dense operations, high-contrast alert, soft desktop object, or playful canvas.
3. Preserve the user's requested content and behavior. Redesign presentation before inventing new features.
4. Prefer one strong hierarchy: primary metric or action, secondary details, then tertiary metadata.
5. Treat the Dashboard grid size as a hard constraint. Design for the current widget bounds first, then make it resilient to resize.
6. Critique the widget before finalizing: scan for cramped spacing, unclear status color, unreadable text, competing focal points, missing states, and unnecessary chrome.

## KKTerm Visual Language

- Prefer desktop utility over marketing-page composition.
- Use compact cards, meters, status chips, timelines, small controls, and object-like surfaces.
- Keep the host widget frame visible; do not duplicate the app's outer card chrome inside the widget.
- Use the widget accent only when it helps meaning or grouping.
- Keep decorative effects subtle. Avoid heavy glassmorphism, oversized hero sections, excessive gradients, and animated clutter.
- Use system-ish type sizing: clear labels, readable values, short captions, and no tiny critical text.
- Keep icons functional. If an icon does not clarify status, action, or category, omit it.

## Layout Rules

- Start with a single-column layout for small widgets and a two-zone layout only when there is enough room.
- Keep controls close to the content they affect.
- Put refresh, configure, or secondary actions in a quiet top or bottom utility row.
- Avoid inner scrollbars in the default state. If overflow is unavoidable, make the scroll area intentional and label what it contains.
- Use fluid sizing from the widget viewport. Avoid fixed desktop-sized canvases or hardcoded full-page dimensions.
- Do not rely on browser page background; the widget is rendered inside KKTerm's Dashboard surface.

## State Design

Every data-driven widget should have clear states:

- Loading: short, low-noise progress text or skeleton shape.
- Empty: explain what is missing and what action would populate it.
- Error: show the user-facing failure and a safe retry path.
- Stale: show last updated time when data can become old.
- Success: make the primary result visible without requiring reading every detail.

## Redesign Heuristics

When improving an existing widget:

1. Keep the current data model and bridge calls unless the user asked for behavior changes.
2. Remove visual noise before adding new elements.
3. Consolidate duplicate labels and repeated timestamps.
4. Make the most important value readable at a glance.
5. Normalize spacing, border radius, and color use across repeated rows.
6. Preserve non-English text exactly.
7. Patch only the smallest source area needed.

## Handoff Checklist

Before creating or updating a widget, verify:

- It fits the assigned Dashboard grid bounds.
- It has a readable hierarchy at small sizes.
- Loading, empty, error, and stale states are present when relevant.
- Color is not the only status cue.
- Animation is bounded and can stop when not needed.
- The code stays script-widget compatible and does not import runtime CDN assets.
