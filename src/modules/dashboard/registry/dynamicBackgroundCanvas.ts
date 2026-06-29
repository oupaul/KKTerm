export const MAX_DYNAMIC_BACKGROUND_DPR = 1.5;

export function dynamicBackgroundDevicePixelRatio(devicePixelRatio: number | undefined): number {
  return Math.min(MAX_DYNAMIC_BACKGROUND_DPR, Math.max(1, devicePixelRatio || 1));
}
