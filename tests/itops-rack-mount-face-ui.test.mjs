import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("rack elevations expose cabinet and toolbar flip icons", async () => {
  const [elevation, sites, css, bag] = await Promise.all([
    read("src/modules/itops/RackElevation.tsx"),
    read("src/modules/itops/SitesTab.tsx"),
    read("src/modules/itops/itops.css"),
    read("src/modules/itops/KuaiKuaiBag.tsx"),
  ]);

  assert.match(elevation, /className="rk-cabinet-flip"/);
  assert.match(elevation, /data-face=\{displayFace\}/);
  assert.match(elevation, /face-turning/);
  assert.match(sites, /allRackFacesLabel/);
  assert.match(sites, /className="it-drill-action rack-flip-all-action"/);
  assert.match(
    sites,
    /setAllElevationFaces\(globalElevationFace === "front" \? "rear" : "front"\)/,
  );
  assert.doesNotMatch(sites, /rack-face-global-control/);
  assert.match(sites, /setAllElevationFaces/);
  assert.match(css, /@keyframes rkFaceTurn/);
  assert.match(css, /\.rk\[data-face="rear"\]/);
  assert.match(bag, /data-face=\{face\}/);
  assert.match(bag, /face === "rear"/);
});

test("Rack View and 2.5D render independent front and rear faces", async () => {
  const [stage, iso] = await Promise.all([
    read("src/modules/itops/RackStage.tsx"),
    read("src/modules/itops/ServerRoomIsoView.tsx"),
  ]);

  assert.match(stage, /frontItems\.length > 0 && rearItems\.length > 0/);
  assert.match(stage, /dualFace/);
  assert.match(stage, /faces\.map/);
  assert.match(stage, /face === "front"\s*\?\s*"left"\s*:\s*"right"/);
  assert.match(stage, /spreadBalloonLane/);
  assert.match(iso, /<IsoRackSkin rack=\{rack\} axis="[xy]" face="front"/);
  assert.match(iso, /<IsoRackSkin rack=\{rack\} axis="[xy]" face="rear"/);
  assert.match(iso, /rm-iso-front-marker/);
});
