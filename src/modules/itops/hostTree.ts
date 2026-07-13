// Pure Host inventory helpers (docs/ITOPS.md Hosts): parse a pasted hostname
// list for import, and arrange a Site's flat Host rows into the parent/child
// tree the Hosts panel and the Rack View callouts render. No I/O.

import type { SiteHost } from "../../types";

/** One rendered row of the Hosts tree: the Host plus its nesting depth. */
export interface HostTreeRow {
  host: SiteHost;
  depth: number;
}

/**
 * Parse a pasted hostname list: one hostname per line (commas also separate),
 * trimmed and comment lines (#) dropped. Duplicate and blank entries are kept
 * so the backend can include them in the import result's skipped count.
 */
export function parseHostnameList(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((value) => !value.startsWith("#"));
}

/** A Host's display name: its label when set, otherwise the hostname. */
export function hostDisplayName(host: SiteHost): string {
  return host.label.trim() || host.hostname;
}

/** Direct children of `hostId`, in stored order. */
export function childHostsOf(hosts: SiteHost[], hostId: string): SiteHost[] {
  return hosts.filter((host) => host.parentHostId === hostId);
}

/**
 * Flatten a Site's Hosts into depth-first tree rows: top-level Hosts in stored
 * order, each followed by its children. Rows whose parent id doesn't resolve
 * (or that would sit inside a cycle from bad data) surface at the top level
 * rather than disappearing.
 */
export function buildHostTreeRows(hosts: SiteHost[]): HostTreeRow[] {
  const byId = new Map(hosts.map((host) => [host.id, host]));
  const roots: SiteHost[] = [];
  const childrenOf = new Map<string, SiteHost[]>();
  for (const host of hosts) {
    const parentId = host.parentHostId ?? null;
    if (parentId && byId.has(parentId)) {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(host);
      childrenOf.set(parentId, siblings);
    } else {
      roots.push(host);
    }
  }
  const rows: HostTreeRow[] = [];
  const visited = new Set<string>();
  const walk = (host: SiteHost, depth: number) => {
    if (visited.has(host.id)) return;
    visited.add(host.id);
    rows.push({ host, depth });
    for (const child of childrenOf.get(host.id) ?? []) {
      walk(child, depth + 1);
    }
  };
  for (const root of roots) walk(root, 0);
  // Cycle members have a resolvable parent, so they are neither roots nor
  // reachable from one; append them flat so no row is ever lost.
  for (const host of hosts) {
    if (!visited.has(host.id)) walk(host, 0);
  }
  return rows;
}

/**
 * Hosts that may become `hostId`'s parent: any Host in the Site that is not
 * the Host itself and not one of its descendants. Pass a blank id for a new
 * Host (everything is eligible).
 */
export function eligibleParentHosts(hosts: SiteHost[], hostId: string): SiteHost[] {
  if (!hostId) return hosts;
  const blocked = new Set<string>([hostId]);
  // Walk down: repeatedly absorb children of blocked hosts.
  let grew = true;
  while (grew) {
    grew = false;
    for (const host of hosts) {
      if (
        host.parentHostId &&
        blocked.has(host.parentHostId) &&
        !blocked.has(host.id)
      ) {
        blocked.add(host.id);
        grew = true;
      }
    }
  }
  return hosts.filter((host) => !blocked.has(host.id));
}
