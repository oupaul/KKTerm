import { resolveNewDashboardViewBackground } from "./newViewBackground";
import { DYNAMIC_BACKGROUNDS } from "./registry/dynamicBackgrounds";

const disabled = resolveNewDashboardViewBackground(false, () => 0);
if (disabled !== null) {
  throw new Error("New Dashboard Views should keep the default background when random dynamic backgrounds are disabled.");
}

const first = resolveNewDashboardViewBackground(true, () => 0);
if (first?.kind !== "dynamic" || first.dynamic !== DYNAMIC_BACKGROUNDS[0]?.id) {
  throw new Error("Random dynamic Dashboard backgrounds should pick the first option for a zero random value.");
}

const last = resolveNewDashboardViewBackground(true, () => 0.999999);
if (last?.kind !== "dynamic" || last.dynamic !== DYNAMIC_BACKGROUNDS[DYNAMIC_BACKGROUNDS.length - 1]?.id) {
  throw new Error("Random dynamic Dashboard backgrounds should pick the last option for a high random value.");
}

const clamped = resolveNewDashboardViewBackground(true, () => 1);
if (clamped?.kind !== "dynamic" || clamped.dynamic !== DYNAMIC_BACKGROUNDS[DYNAMIC_BACKGROUNDS.length - 1]?.id) {
  throw new Error("Random dynamic Dashboard backgrounds should clamp out-of-range random values.");
}
