// Rack topology grouping for the Fleets tree + drill-down (docs/FLEET.md Rack
// View). Folds a Fleet's flat rack list into the nested hierarchy
// region → datacenter → server room → racks, preserving stored order. Blank
// levels collapse under an "Unassigned" bucket (empty key, ""). Node ids are
// stable strings so the tree's collapse state and the drill path survive
// reloads and identify a node unambiguously.

import type { Rack } from "../../types";

export interface ServerRoomGroup {
  /** Stored value ("" = Unassigned). */
  key: string;
  racks: Rack[];
}
export interface DatacenterGroup {
  key: string;
  serverRooms: ServerRoomGroup[];
  rackCount: number;
}
export interface RegionGroup {
  key: string;
  datacenters: DatacenterGroup[];
  rackCount: number;
}

export function groupRackTopology(racks: Rack[]): RegionGroup[] {
  const regions: RegionGroup[] = [];
  for (const rack of racks) {
    const regionKey = rack.region ?? "";
    const dcKey = rack.datacenter ?? "";
    const roomKey = rack.serverRoom ?? "";

    let region = regions.find((entry) => entry.key === regionKey);
    if (!region) {
      region = { key: regionKey, datacenters: [], rackCount: 0 };
      regions.push(region);
    }
    region.rackCount += 1;

    let datacenter = region.datacenters.find((entry) => entry.key === dcKey);
    if (!datacenter) {
      datacenter = { key: dcKey, serverRooms: [], rackCount: 0 };
      region.datacenters.push(datacenter);
    }
    datacenter.rackCount += 1;

    let room = datacenter.serverRooms.find((entry) => entry.key === roomKey);
    if (!room) {
      room = { key: roomKey, racks: [] };
      datacenter.serverRooms.push(room);
    }
    room.racks.push(rack);
  }
  return regions;
}

// A drill path into one Fleet's topology. Each deeper field is only meaningful
// when its parents are set; `rackId` is the leaf (single-rack detail).
export interface DrillPath {
  region: string | null;
  datacenter: string | null;
  serverRoom: string | null;
  rackId: string | null;
}

export const EMPTY_DRILL: DrillPath = {
  region: null,
  datacenter: null,
  serverRoom: null,
  rackId: null,
};

// Stable node ids for tree collapse + selection.
export const nodeId = {
  fleet: (fleetId: string) => `fleet:${fleetId}`,
  region: (fleetId: string, region: string) => `region:${fleetId}/${region}`,
  datacenter: (fleetId: string, region: string, dc: string) => `dc:${fleetId}/${region}/${dc}`,
  serverRoom: (fleetId: string, region: string, dc: string, room: string) =>
    `room:${fleetId}/${region}/${dc}/${room}`,
  rack: (rackId: string) => `rack:${rackId}`,
};
