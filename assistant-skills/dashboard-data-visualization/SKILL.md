---
name: dashboard-data-visualization
description: Design KKTerm Dashboard widgets that show metrics, charts, logs, timelines, gauges, health states, trends, and operational data without misleading users.
---

# Dashboard Data Visualization

Use this skill when a Dashboard widget needs charts, metrics, service health, trends, logs, gauges, timelines, counters, or operational summaries. Pair it with `dashboard-widget-builder` for implementation and `dashboard-widget-designer` for broader visual polish.

## Visualization Workflow

1. Identify the user's question before choosing a chart: current value, trend, comparison, distribution, threshold, incident, or history.
2. Choose the simplest representation that answers that question inside the widget's available size.
3. Preserve source units, timestamps, and uncertainty. Do not invent precision.
4. Prefer glanceable summaries with drill-down details only when the widget has room.
5. Include empty, loading, error, stale, and partial-data states for live or external data.

## Chart Selection

- Single important value: metric tile with unit, trend delta, and freshness.
- Status across resources: compact status list with severity chips and counts.
- Short time trend: sparkline or mini area chart with clear last value.
- Threshold monitoring: gauge, progress bar, or banded meter with explicit threshold labels.
- Event sequence: timeline or log strip with severity and timestamp.
- Comparison across a few items: horizontal bars, not tiny pies.
- Dense logs: latest-events list with filtering or grouping, not a chart.

Avoid charts that look impressive but do not answer the user question.

## Operational Semantics

- Use consistent severity order: healthy, info, warning, critical, unknown.
- Make unknown or stale data visually distinct from healthy data.
- Show last updated time for live data.
- Label units directly near numbers.
- Do not hide failed fetches behind optimistic green status.
- Do not show fake sample data unless the user explicitly asked for a mock.

## Color and Encoding

- Color must reinforce meaning, not carry it alone.
- Use shape, label, icon, position, or text alongside color for health states.
- Avoid rainbow palettes for operational dashboards.
- Reserve red/orange for real warnings and failures.
- Use neutral tones for background gridlines and non-critical context.

## Scale and Integrity

- Do not truncate axes in a way that exaggerates small differences unless the label makes the scale obvious.
- For sparklines without axes, label the current value and the time window.
- Keep moving averages, smoothing, or derived scores explicit.
- If data is missing, show missing rather than drawing a continuous line through it.
- Prefer exact numbers for small counts and rounded values for noisy telemetry.

## KKTerm Widget Constraints

- Keep charts compact and legible at Dashboard widget sizes.
- Prefer SVG or canvas drawn from the widget viewport.
- Recompute dimensions on resize.
- Stop animation loops when a chart is static or when the widget no longer needs live rendering.
- Use curated local libraries only when their documented globals are actually needed.
