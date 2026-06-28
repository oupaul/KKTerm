// Rack topology grouping for the Fleets tree + drill-down (docs/FLEET.md Rack
// View). Folds a Fleet's flat rack list into the hierarchy
// Fleet → Server Room → Rack, preserving stored order. A blank server room
// collapses under an "Unassigned" bucket (empty key, ""). Node ids are stable
// strings so the tree's collapse state and the drill path survive reloads and
// identify a node unambiguously.

import type { Rack } from "../../types";

export interface ServerRoomGroup {
  /** Stored value ("" = Unassigned). */
  key: string;
  racks: Rack[];
}

export function groupRackTopology(racks: Rack[]): ServerRoomGroup[] {
  const rooms: ServerRoomGroup[] = [];
  for (const rack of racks) {
    const roomKey = rack.serverRoom ?? "";
    let room = rooms.find((entry) => entry.key === roomKey);
    if (!room) {
      room = { key: roomKey, racks: [] };
      rooms.push(room);
    }
    room.racks.push(rack);
  }
  return rooms;
}

export interface RackGroup {
  /** Stored value ("" = Ungrouped). */
  key: string;
  racks: Rack[];
}

/** Sub-group a server room's racks by their `rackGroup` tag, preserving order. */
export function groupRacksByGroup(racks: Rack[]): RackGroup[] {
  const groups: RackGroup[] = [];
  for (const rack of racks) {
    const key = rack.rackGroup ?? "";
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      group = { key, racks: [] };
      groups.push(group);
    }
    group.racks.push(rack);
  }
  return groups;
}

// A drill path into one Fleet's topology: a server room and, at the leaf, a
// single rack.
export interface DrillPath {
  serverRoom: string | null;
  rackId: string | null;
}

export const EMPTY_DRILL: DrillPath = {
  serverRoom: null,
  rackId: null,
};

// Stable node ids for tree collapse + selection.
export const nodeId = {
  fleet: (fleetId: string) => `fleet:${fleetId}`,
  serverRoom: (fleetId: string, room: string) => `room:${fleetId}/${room}`,
  rack: (rackId: string) => `rack:${rackId}`,
};
