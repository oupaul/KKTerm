import assert from "node:assert/strict";
import test from "node:test";
import type { RunHistoryEntry, SiteHost } from "../src/types";
import type { LiveRun } from "../src/modules/itops/state";
import { hostRunStatuses } from "../src/modules/itops/hostRunStatus";

const hosts = [
  {
    id: "host-1",
    siteId: "site-1",
    hostname: "web-01",
    label: "",
    kind: "physical",
    parentHostId: null,
    notes: "",
    connectionIds: ["management-url", "ssh-1"],
    scan: null,
    sortOrder: 0,
  },
  {
    id: "host-2",
    siteId: "site-1",
    hostname: "web-02",
    label: "",
    kind: "physical",
    parentHostId: null,
    notes: "",
    connectionIds: ["ssh-2"],
    scan: null,
    sortOrder: 1,
  },
] satisfies SiteHost[];

function history(id: string, connectionId: string, ok: boolean): RunHistoryEntry {
  return {
    id,
    source: "manual",
    siteId: "site-1",
    taskId: null,
    taskSummary: "uptime",
    startedAt: id,
    finishedAt: id,
    report: {
      ok: ok ? 1 : 0,
      failed: ok ? 0 : 1,
      total: 1,
      hosts: [{ connectionId, name: connectionId, host: connectionId, transport: "ssh", ok, bytesOut: 0, durationMs: 1 }],
    },
  };
}

test("Host rows show active progress and the newest completed result independently", () => {
  const activeRun: LiveRun = {
    runId: "live",
    siteId: "site-1",
    taskSummary: "deploy",
    state: "running",
    hosts: [
      { connectionId: "ssh-1", name: "web-01", host: "web-01", transport: "ssh", status: "running" },
    ],
  };
  const statuses = hostRunStatuses(
    hosts,
    "site-1",
    activeRun,
    [history("newest", "ssh-1", false), history("older", "management-url", true), history("other", "ssh-2", true)],
  );

  assert.deepEqual(statuses.get("host-1"), { current: "running", last: "failed" });
  assert.deepEqual(statuses.get("host-2"), { current: null, last: "ok" });
});

test("Host status ignores runs from another Site and completed live snapshots", () => {
  const completedRun: LiveRun = {
    runId: "done",
    siteId: "site-1",
    taskSummary: "done",
    state: "done",
    hosts: [{ connectionId: "ssh-1", name: "web-01", host: "web-01", transport: "ssh", status: "ok" }],
  };
  const otherSite = { ...history("other-site", "ssh-1", true), siteId: "site-2" };

  assert.deepEqual(hostRunStatuses(hosts, "site-1", completedRun, [otherSite]).get("host-1"), {
    current: null,
    last: null,
  });
});
