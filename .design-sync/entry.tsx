// design-sync bundle entry for KKTerm's Apple-esque component set.
// Re-exports the curated, presentational components (and the dialog primitive
// family they compose from) so esbuild can build one IIFE → window.KKTerm.
// This file is a build input for /design-sync, not app code.
export * from "../src/app/ui/dialog/Sheet";
export { ConfirmSheet, type ConfirmTone } from "../src/app/ui/dialog/ConfirmSheet";
export { DIcon, DIALOG_ICONS, type DialogIconName } from "../src/app/ui/dialog/icons";
export { ToggleSwitch } from "../src/modules/settings/ToggleSwitch";
export * from "../src/app/ModuleHeader";
export { ColorPalettePicker, isHexColor } from "../src/app/ui/ColorPalettePicker";
