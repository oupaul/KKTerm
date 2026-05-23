import { DYNAMIC_BACKGROUNDS } from "./registry/dynamicBackgrounds";
import type { DashboardBackground } from "./types";

export function resolveNewDashboardViewBackground(
  useRandomDynamicBackground: boolean,
  random: () => number = Math.random,
): DashboardBackground | null {
  if (!useRandomDynamicBackground || DYNAMIC_BACKGROUNDS.length === 0) {
    return null;
  }
  const index = Math.min(
    DYNAMIC_BACKGROUNDS.length - 1,
    Math.max(0, Math.floor(random() * DYNAMIC_BACKGROUNDS.length)),
  );
  return { kind: "dynamic", dynamic: DYNAMIC_BACKGROUNDS[index].id };
}
