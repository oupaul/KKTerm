// Lane (column) assignment for the commit graph.
//
// The mockup shipped with precomputed lanes; real history does not, so we derive
// a lane per commit from the parent DAG. Commits arrive newest-first (row 0 is
// the newest). We sweep top→down maintaining a set of active lanes, where each
// lane "reserves" the commit id that should next occupy it (the child below is
// waiting for that commit). Reserved lanes are never reused for an unrelated
// commit, so a long edge that travels straight down its lane never crosses an
// intervening node — matching how the SVG renderer routes parent↔child curves.

import type { GitCommit, GraphCommit } from "./gitTypes";

export function assignLanes(commits: GitCommit[]): GraphCommit[] {
  // lanes[i] = the commit id reserved for lane i, or null when the lane is free.
  const lanes: (string | null)[] = [];
  const result: GraphCommit[] = [];

  const firstFreeLane = (): number => {
    const idx = lanes.indexOf(null);
    if (idx !== -1) {
      return idx;
    }
    lanes.push(null);
    return lanes.length - 1;
  };

  for (const commit of commits) {
    // 1. This commit's lane is whichever lane a child already reserved for it;
    //    otherwise it opens a fresh lane.
    let lane = lanes.indexOf(commit.id);
    if (lane === -1) {
      lane = firstFreeLane();
    }

    // 2. Other lanes that also reserved this id are branches converging here —
    //    free them so the lane count shrinks after a merge point.
    for (let i = 0; i < lanes.length; i += 1) {
      if (i !== lane && lanes[i] === commit.id) {
        lanes[i] = null;
      }
    }

    // 3. The first parent continues this branch straight down the same lane.
    const [firstParent, ...mergeParents] = commit.parents;
    lanes[lane] = firstParent ?? null;

    // 4. Each additional (merge) parent needs its own reserved lane, reusing one
    //    already waiting on that parent when possible.
    for (const parent of mergeParents) {
      let parentLane = lanes.indexOf(parent);
      if (parentLane === -1) {
        parentLane = firstFreeLane();
      }
      lanes[parentLane] = parent;
    }

    result.push({ ...commit, lane });
  }

  return result;
}

/** Highest lane index used, for sizing the graph gutter. */
export function maxLane(commits: GraphCommit[]): number {
  return commits.reduce((max, c) => Math.max(max, c.lane), 0);
}
