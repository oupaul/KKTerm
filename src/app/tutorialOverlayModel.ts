export type TutorialRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TutorialBalloonSize = {
  width: number;
  height: number;
};

export type TutorialBalloonPlacement = {
  side: "right" | "left" | "bottom" | "top";
  left: number;
  top: number;
};

const VIEWPORT_PADDING = 16;
const TARGET_GAP = 14;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function chooseTutorialBalloonPlacement(
  target: TutorialRect,
  viewport: TutorialRect,
  balloon: TutorialBalloonSize,
): TutorialBalloonPlacement {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const targetRight = target.left + target.width;
  const targetBottom = target.top + target.height;
  const centeredTop = target.top + target.height / 2 - balloon.height / 2;
  const minLeft = viewport.left + VIEWPORT_PADDING;
  const maxLeft = viewportRight - VIEWPORT_PADDING - balloon.width;
  const minTop = viewport.top + VIEWPORT_PADDING;
  const maxTop = viewportBottom - VIEWPORT_PADDING - balloon.height;

  if (targetRight + TARGET_GAP + balloon.width <= viewportRight - VIEWPORT_PADDING) {
    return {
      side: "right",
      left: targetRight + TARGET_GAP,
      top: clamp(centeredTop, minTop, maxTop),
    };
  }

  if (target.left - TARGET_GAP - balloon.width >= viewport.left + VIEWPORT_PADDING) {
    return {
      side: "left",
      left: target.left - TARGET_GAP - balloon.width,
      top: clamp(centeredTop, minTop, maxTop),
    };
  }

  if (targetBottom + TARGET_GAP + balloon.height <= viewportBottom - VIEWPORT_PADDING) {
    return {
      side: "bottom",
      left: clamp(target.left, minLeft, maxLeft),
      top: targetBottom + TARGET_GAP,
    };
  }

  return {
    side: "top",
    left: clamp(target.left, minLeft, maxLeft),
    top: clamp(target.top - TARGET_GAP - balloon.height, minTop, maxTop),
  };
}
