// Placeholder run/automation fixtures for the IT Ops Module, ported from the
// redesign mockup (itops-data.jsx).
//
// Phase 1 wired durable Host Groups to the backend, so those fixtures are gone.
// The Batch Run grid and the Automations list still render against these
// fixtures until Phases 2–3 wire their commands (see docs/ITOPS.md). The values
// here are sample *content* (host names, addresses, commands) — the kind of
// user/runtime data a backend will later supply — not translatable UI chrome.

import { IT_ACCENTS, type ItIconName } from "./icons";

export type Transport = "ssh" | "winrm" | "psexec" | "auto";
export type RunStatus = "ok" | "failed" | "running" | "pending";

export type RunSnapshot = {
  status: RunStatus;
  code?: number;
  dur?: string;
  note?: string;
};

export type RunHost = {
  id: string;
  name: string;
  host: string;
  transport: Transport;
  expanded?: boolean;
  live: RunSnapshot;
  report: RunSnapshot;
};

export type OutputSegment = { cls: string; txt: string };
export type OutputToken = OutputSegment | { cursor: true };

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigKind: ItIconName;
  trigColor: string;
  trigger: string;
  cond: string | null;
  actions: BuilderActionKind[];
  fired: string;
  runs: number;
};

export type BuilderActionKind = "bell" | "mail" | "run" | "bot" | "popup" | "webhook";

export const seg = (cls: string, txt: string): OutputSegment => ({ cls, txt });
export const CURSOR = { cursor: true } as const;

/* ----------------------------- batch run ----------------------------- */
export const RUN_HEADER = {
  task: "sudo apt-get update && sudo apt-get upgrade -y",
  kind: "script",
  group: "Production Web",
  startedAt: "14:32:07",
};

// per-host run rows. `live` and `report` give the two snapshot states.
export const RUN_HOSTS: RunHost[] = [
  { id: "c1", name: "web-01", host: "10.0.4.11", transport: "ssh",
    live: { status: "ok", code: 0, dur: "12.4s" }, report: { status: "ok", code: 0, dur: "12.4s" } },
  { id: "c2", name: "web-02", host: "10.0.4.12", transport: "ssh",
    live: { status: "ok", code: 0, dur: "11.8s" }, report: { status: "ok", code: 0, dur: "11.8s" } },
  { id: "c3", name: "web-03", host: "10.0.4.13", transport: "ssh", expanded: true,
    live: { status: "running", dur: "0:06" }, report: { status: "ok", code: 0, dur: "13.1s" } },
  { id: "c4", name: "web-04", host: "10.0.4.14", transport: "ssh",
    live: { status: "running", dur: "0:05" }, report: { status: "ok", code: 0, dur: "14.0s" } },
  { id: "c5", name: "lb-01", host: "10.0.4.20", transport: "ssh",
    live: { status: "ok", code: 0, dur: "9.2s" }, report: { status: "ok", code: 0, dur: "9.2s" } },
  { id: "c6", name: "lb-02", host: "10.0.4.21", transport: "ssh", expanded: true,
    live: { status: "failed", code: 100, dur: "3.0s" }, report: { status: "failed", code: 100, dur: "3.0s" } },
  { id: "c7", name: "win-build-01", host: "10.0.6.5", transport: "winrm",
    live: { status: "pending" }, report: { status: "ok", code: 0, dur: "22.6s" } },
  { id: "c8", name: "edge-cache", host: "10.0.4.9", transport: "ssh",
    live: { status: "pending" }, report: { status: "failed", code: -1, dur: "120s", note: "transport timeout" } },
];

/* streamed output bodies keyed by host id (read-only terminal surface) */
export const RUN_OUTPUT: Record<string, OutputToken[][]> = {
  c3: [
    [seg("c-dim", "$ "), seg("c-key", "sudo "), seg("", "apt-get update")],
    [seg("c-cm", "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease")],
    [seg("c-cm", "Get:2 http://security.ubuntu.com jammy-security InRelease [110 kB]")],
    [seg("c-val", "Fetched 110 kB in 1s (98.4 kB/s)")],
    [seg("", "Reading package lists... "), seg("c-prompt", "Done")],
    [seg("c-dim", "$ "), seg("c-key", "sudo "), seg("", "apt-get upgrade -y")],
    [seg("", "The following packages will be upgraded:")],
    [seg("c-path", "  libssl3 openssl curl libcurl4 tzdata")],
    [seg("c-cm", "Setting up libssl3:amd64 (3.0.2-0ubuntu1.15) ...")],
    [seg("c-cm", "Setting up openssl (3.0.2-0ubuntu1.15) ..."), CURSOR],
  ],
  c6: [
    [seg("c-dim", "$ "), seg("c-key", "sudo "), seg("", "apt-get update")],
    [seg("c-err", "E: Could not get lock /var/lib/dpkg/lock-frontend")],
    [seg("c-err", "   - open (11: Resource temporarily unavailable)")],
    [seg("c-warn", "E: Unable to acquire the dpkg frontend lock; is another")],
    [seg("c-warn", "   process using it? (unattended-upgrades, pid 41207)")],
    [seg("c-dim", "command exited with status "), seg("c-err", "100")],
  ],
  c1: [
    [seg("c-cm", "Reading package lists... Done")],
    [seg("c-cm", "Building dependency tree... Done")],
    [seg("c-prompt", "0 upgraded, 0 newly installed, 0 to remove")],
    [seg("c-dim", "command exited with status "), seg("c-val", "0")],
  ],
};

/* ----------------------------- automations ----------------------------- */
export const AUTOMATIONS: Automation[] = [
  { id: "a1", name: "Disk usage > 85% → alert + cleanup", enabled: true,
    trigKind: "gauge", trigColor: IT_ACCENTS.orange,
    trigger: "Disk usage  ·  db-primary", cond: "> 85%",
    actions: ["bell", "mail", "run"], fired: "fired 2h ago", runs: 14 },
  { id: "a2", name: "Nightly apt upgrade", enabled: true,
    trigKind: "calendar", trigColor: IT_ACCENTS.indigo,
    trigger: "Schedule  ·  every day 03:00", cond: null,
    actions: ["run", "bell"], fired: "next in 8h", runs: 62 },
  { id: "a3", name: "prod-web-01 output silence", enabled: true,
    trigKind: "pulse", trigColor: IT_ACCENTS.teal,
    trigger: "SSH output silence  ·  prod-web-01", cond: "for 5m",
    actions: ["bot"], fired: "armed · idle", runs: 3 },
  { id: "a4", name: "5xx spike webhook → page on-call", enabled: false,
    trigKind: "webhook", trigColor: IT_ACCENTS.purple,
    trigger: "Inbound webhook  ·  /hooks/alertmgr", cond: null,
    actions: ["popup", "run"], fired: "disabled", runs: 0 },
  { id: "a5", name: "TLS cert expiry < 14 days", enabled: true,
    trigKind: "globe", trigColor: IT_ACCENTS.green,
    trigger: "HTTP-JSON probe  ·  /metrics/cert", cond: "< 14 days",
    actions: ["mail"], fired: "fired yesterday", runs: 5 },
];

export type BuilderAction = {
  kind: BuilderActionKind;
  color: string;
  label: string;
  detail: string;
};

/* the automation opened in the builder (matches a1) */
export const BUILDER_AUTOMATION = {
  id: "a1",
  name: "Disk usage > 85% → alert + cleanup",
  enabled: true,
  trigger: {
    kind: "gauge" as ItIconName,
    color: IT_ACCENTS.orange,
    label: "Performance counter",
    detail: "Disk usage (%)",
    target: "db-primary · 10.0.4.31",
    poll: "every 60s",
  },
  condition: { op: "gt", label: "is greater than", value: "85", unit: "%" },
  actions: [
    { kind: "bell", color: IT_ACCENTS.blue, label: "Notify", detail: "Status Bar + toast + sound" },
    { kind: "mail", color: IT_ACCENTS.green, label: "Email", detail: "to ops@kkterm.io · SMTP via keychain" },
    { kind: "run", color: IT_ACCENTS.orange, label: "Run Batch", detail: "“Database Cluster” · playbook: clear journald + apt clean" },
  ] as BuilderAction[],
};
