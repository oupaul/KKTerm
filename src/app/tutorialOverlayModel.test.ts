import {
  chooseTutorialBalloonPlacement,
  type TutorialRect,
} from "./tutorialOverlayModel.ts";

const viewport = { left: 0, top: 0, width: 1000, height: 700 };
const target: TutorialRect = { left: 300, top: 220, width: 200, height: 48 };

const rightPlacement = chooseTutorialBalloonPlacement(target, viewport, {
  width: 260,
  height: 120,
});

if (rightPlacement.side !== "right") {
  throw new Error("Tutorial balloon should prefer the right side when there is room.");
}

if (rightPlacement.left <= target.left + target.width) {
  throw new Error("Right-side tutorial balloon should sit after the target.");
}

const nearRightEdge: TutorialRect = { left: 820, top: 220, width: 150, height: 48 };
const leftPlacement = chooseTutorialBalloonPlacement(nearRightEdge, viewport, {
  width: 260,
  height: 120,
});

if (leftPlacement.side !== "left") {
  throw new Error("Tutorial balloon should move left near the right viewport edge.");
}

if (leftPlacement.left + 260 >= nearRightEdge.left) {
  throw new Error("Left-side tutorial balloon should sit before the target.");
}

const crampedTarget: TutorialRect = { left: 20, top: 620, width: 80, height: 36 };
const clampedPlacement = chooseTutorialBalloonPlacement(crampedTarget, viewport, {
  width: 260,
  height: 120,
});

if (clampedPlacement.top + 120 > viewport.height - 16) {
  throw new Error("Tutorial balloon should clamp to the viewport bottom padding.");
}
