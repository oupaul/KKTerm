import { convertFileSrc } from "@tauri-apps/api/core";
import { defaultAppearanceSettings, defaultTerminalSettings } from "../app-defaults";
import type { AppearanceSettings, CustomFont, TerminalSettings } from "../types";
import { invokeCommand, isTauriRuntime } from "./tauri";

const CUSTOM_FONT_FALLBACK = '"Segoe UI", ui-sans-serif, system-ui, sans-serif';
export const CUSTOM_FONTS_LOADED_EVENT = "kkterm:custom-fonts-loaded";

const loadedFontFaces = new Set<string>();

export interface CustomFontOption {
  name: string;
  path: string;
  faces: CustomFont[];
  isMonospace: boolean;
  cssFamily: string;
  cssValue: string;
}

export function customFontCssFamily(family: string) {
  return `KKTerm Custom Font ${hashText(family.trim().toLowerCase())}`;
}

export function customFontCssValue(family: string) {
  return `"${customFontCssFamily(family)}", ${CUSTOM_FONT_FALLBACK}`;
}

export function toCustomFontOptions(fonts: CustomFont[]): CustomFontOption[] {
  const groups = new Map<string, CustomFont[]>();
  for (const font of fonts) {
    const key = font.family.trim().toLowerCase();
    const group = groups.get(key);
    if (group) group.push(font);
    else groups.set(key, [font]);
  }

  return [...groups.values()]
    .map((faces) => {
      faces.sort(compareCustomFontFaces);
      const name = faces[0].family;
      return {
        name,
        path: faces[0].path,
        faces,
        isMonospace: faces.some((face) => face.isMonospace),
        cssFamily: customFontCssFamily(name),
        cssValue: customFontCssValue(name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function fontFaceDescriptors(font: CustomFont): FontFaceDescriptors {
  return { display: "swap", style: font.style, weight: String(font.weight) };
}

export function notifyCustomFontsLoaded(target: EventTarget = document) {
  target.dispatchEvent(new Event(CUSTOM_FONTS_LOADED_EVENT));
}

export function terminalCustomFontOptions(fonts: CustomFontOption[]) {
  return fonts
    .filter((font) => font.isMonospace)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeAvailableTerminal(
  settings: TerminalSettings,
  customFonts: CustomFontOption[],
): TerminalSettings {
  const selectedCustomFont = customFonts.find(
    (font) => settings.fontFamily === `"${font.name}", monospace`,
  );
  if (!selectedCustomFont || selectedCustomFont.isMonospace) {
    return settings;
  }
  return { ...settings, fontFamily: defaultTerminalSettings.fontFamily };
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
    fonts.flatMap((option) => option.faces.map(async (font) => {
      // Fetch through the asset protocol so the WebView downloads and decodes
      // the font on its own (native, off-main-thread) resource pipeline. This
      // keeps multi-megabyte fonts off the UI thread on startup: no base64
      // payload crosses the IPC boundary and no decode runs in JS.
      //
      // Fetch the bytes ourselves instead of pointing FontFace at the asset
      // url directly: a FontFace url source makes the WebView issue a *ranged*
      // font request, and Tauri's asset protocol caps each range response at
      // ~1 MB. That truncates large CJK fonts to their first chunk — the
      // header/cmap and early (Latin) glyphs survive while the bulk of the CJK
      // outlines are dropped, so only Latin text picks up the font. A plain
      // fetch sends no Range header, so the protocol returns the whole file.
      const buffer = await (await fetch(convertFileSrc(font.path))).arrayBuffer();
      const families = [option.cssFamily, option.name, font.name];
      await Promise.allSettled(
        families.map(async (family) => {
          const key = `${family.toLowerCase()}|${font.weight}|${font.style}`;
          if (!family || loadedFontFaces.has(key)) return;
          const face = new FontFace(family, buffer.slice(0), fontFaceDescriptors(font));
          await face.load();
          document.fonts.add(face);
          loadedFontFaces.add(key);
        }),
      );
    })),
  );
  if (fonts.length > 0) {
    notifyCustomFontsLoaded();
  }
}

export function normalizeAvailableAppearance(
  settings: AppearanceSettings,
  customFonts: CustomFontOption[],
): AppearanceSettings {
  if (!settings.customFontPath) {
    return settings;
  }

  const customFont = customFonts.find((font) =>
    font.faces.some((face) => face.path === settings.customFontPath),
  );
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

function compareCustomFontFaces(a: CustomFont, b: CustomFont) {
  const aStyle = a.style === "normal" ? 0 : 1;
  const bStyle = b.style === "normal" ? 0 : 1;
  return aStyle - bStyle || Math.abs(a.weight - 400) - Math.abs(b.weight - 400) || a.name.localeCompare(b.name);
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
