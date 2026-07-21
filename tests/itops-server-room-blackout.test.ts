import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SERVER_ROOM_BLACKOUT_SEQUENCE,
  trackServerRoomBlackoutKey,
  type ServerRoomBlackoutKey,
} from "../src/modules/itops/ServerRoomIsoView";

function enterSequence(
  keys: readonly string[],
  startAt = 0,
  stepMs = 200,
): { buffer: ServerRoomBlackoutKey[]; complete: boolean } {
  let state: { buffer: ServerRoomBlackoutKey[]; complete: boolean } = {
    buffer: [],
    complete: false,
  };
  keys.forEach((key, index) => {
    state = trackServerRoomBlackoutKey(state.buffer, key, startAt + index * stepMs);
  });
  return state;
}

test("the classic sequence triggers only when all keys arrive within three seconds", () => {
  assert.equal(enterSequence(SERVER_ROOM_BLACKOUT_SEQUENCE).complete, true);
  assert.equal(enterSequence(SERVER_ROOM_BLACKOUT_SEQUENCE, 0, 400).complete, false);
  assert.equal(
    enterSequence(["arrowleft", ...SERVER_ROOM_BLACKOUT_SEQUENCE]).complete,
    true,
  );
});

test("the 2.5D room owns the blackout phases, protected 乖乖 glow, and reduced-motion fallback", async () => {
  const [view, css] = await Promise.all([
    readFile("src/modules/itops/ServerRoomIsoView.tsx", "utf8"),
    readFile("src/modules/itops/itops.css", "utf8"),
  ]);

  assert.match(view, /data-blackout-phase=\{blackoutPhase\}/);
  assert.match(view, /window\.addEventListener\("keydown", onKeyDown, true\)/);
  assert.match(view, /\[data-blackout-light\]/);
  assert.match(view, /className="rm-iso-blackout-(?:fx|bolt|arcs|smoke)"/);
  assert.match(view, /<BlackoutDeviceArc seed=\{item\.id\}/);
  assert.match(view, /<BlackoutDeviceArc seed=\{object\.id\} liftPx=\{h\}/);
  assert.doesNotMatch(view, /className="rm-iso-blackout-arcs"/);
  assert.match(view, /className="rm-iso-blackout-kuaikuais"/);
  assert.match(view, /querySelectorAll<HTMLElement>\([\s\S]*rm-iso-rack-top-kuaiguai/);
  assert.match(css, /data-blackout-phase="dark"[^}]*\.rm-iso-scroll[^}]*brightness\(0\.12\)/s);
  assert.match(css, /rm-iso-blackout-(?:flicker|vignette)[^}]*var\(--terminal-2\)/s);
  assert.match(css, /data-kind="kuaikuai"[^}]*brightness\(7\.5\)[^}]*drop-shadow\([^)]*var\(--green\)/s);
  assert.match(css, /rm-iso-blackout-kuaikuai[^}]*drop-shadow\([^)]*var\(--green\)/s);
  assert.match(css, /rm-iso-obj-model > \.rm-iso-device-arc[^}]*--blackout-arc-lift/s);
  assert.match(css, /data-blackout-phase="dark"[^}]*\.rm-iso-device-arc[^}]*rmBlackoutArc/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.rm-iso-blackout-flicker/);
});
