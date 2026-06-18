import { convertFileSrc } from "@tauri-apps/api/core";
import { defaultAppearanceSettings } from "../app-defaults";
import type { AppearanceSettings, CustomFont } from "../types";
import { invokeCommand, isTauriRuntime } from "./tauri";

const CUSTOM_FONT_FALLBACK = '"Segoe UI", ui-sans-serif, system-ui, sans-serif';

const loadedFontFamilies = new Set<string>();

export interface CustomFontOption extends CustomFont {
  cssFamily: string;
  cssValue: string;
}

export function customFontCssFamily(path: string) {
  return `KKTerm Custom Font ${hashPath(path)}`;
}

export function customFontCssValue(path: string) {
  return `"${customFontCssFamily(path)}", ${CUSTOM_FONT_FALLBACK}`;
}

export function toCustomFontOptions(fonts: CustomFont[]): CustomFontOption[] {
  return fonts.map((font) => ({
    ...font,
    cssFamily: customFontCssFamily(font.path),
    cssValue: customFontCssValue(font.path),
  }));
}

export async function listCustomFontOptions() {
  if (!isTauriRuntime()) {
    return [];
  }
  const fonts = await invokeCommand("list_custom_fonts");
  const options = toCustomFontOptions(fonts);
  void loadCustomFontOptions(options);
  return options;
}

export async function loadCustomFontOptions(fonts: CustomFontOption[]) {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }

  await Promise.allSettled(
    fonts.map(async (font) => {
      // Register each custom font under two families backed by the same file:
      // an internal synthetic family used by the app UI font picker, and the
      // font's human-readable file name. The terminal font field is free text,
      // so users reference dropped-in fonts (e.g. Nerd Fonts) by the name they
      // see and type rather than an opaque synthetic id.
      const families = [font.cssFamily, font.name].filter(
        (family) => family.length > 0 && !loadedFontFamilies.has(family),
      );
      if (families.length === 0) {
        return;
      }
      // Load through the asset protocol so the WebView fetches and decodes the
      // font on its own (native, off-main-thread) resource pipeline. This keeps
      // multi-megabyte fonts off the UI thread on startup: no base64 payload
      // crosses the IPC boundary and no decode runs in JS.
      const source = `url("${convertFileSrc(font.path)}")`;
      await Promise.allSettled(
        families.map(async (family) => {
          const face = new FontFace(family, source, { display: "swap" });
          await face.load();
          document.fonts.add(face);
          loadedFontFamilies.add(family);
        }),
      );
    }),
  );
}

export function normalizeAvailableAppearance(
  settings: AppearanceSettings,
  customFonts: CustomFontOption[],
): AppearanceSettings {
  if (!settings.customFontPath) {
    return settings;
  }

  const customFont = customFonts.find((font) => font.path === settings.customFontPath);
  if (!customFont) {
    return defaultAppearanceSettings;
  }

  if (settings.appFontFamily !== customFont.cssValue) {
    return {
      ...settings,
      appFontFamily: customFont.cssValue,
    };
  }

  return settings;
}

function hashPath(path: string) {
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
