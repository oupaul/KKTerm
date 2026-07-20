import { X } from "../../lib/reicon";
import { technicalInputProps } from "../../lib/inputBehavior";
import { useTranslation } from "react-i18next";
import { useScreenshotSettingsDraft } from "./screenshotSettingsDraft";

type ShortcutKey = "regionShortcut" | "windowShortcut" | "fullscreenShortcut";
type EnabledKey =
  | "regionShortcutEnabled"
  | "windowShortcutEnabled"
  | "fullscreenShortcutEnabled";

const SCREENSHOT_SHORTCUTS: ReadonlyArray<{
  labelKey: string;
  shortcutKey: ShortcutKey;
  enabledKey: EnabledKey;
}> = [
  {
    labelKey: "screenshots.captureRegion",
    shortcutKey: "regionShortcut",
    enabledKey: "regionShortcutEnabled",
  },
  {
    labelKey: "screenshots.captureWindow",
    shortcutKey: "windowShortcut",
    enabledKey: "windowShortcutEnabled",
  },
  {
    labelKey: "screenshots.captureFullscreen",
    shortcutKey: "fullscreenShortcut",
    enabledKey: "fullscreenShortcutEnabled",
  },
];

export function ScreenshotShortcutRows() {
  const { t } = useTranslation();
  const draft = useScreenshotSettingsDraft((state) => state.draft);
  const update = useScreenshotSettingsDraft((state) => state.update);

  if (!draft) {
    return null;
  }

  function updateShortcut(
    shortcutKey: ShortcutKey,
    enabledKey: EnabledKey,
    value: string,
  ) {
    update({
      [shortcutKey]: value,
      [enabledKey]: value.trim().length > 0,
    });
  }

  return SCREENSHOT_SHORTCUTS.map(({ labelKey, shortcutKey, enabledKey }) => {
    const label = t(labelKey);
    const value = draft[enabledKey] ? draft[shortcutKey] : "";
    return (
      <div className="shortcut-row" key={shortcutKey}>
        <span className="shortcut-row-label">{label}</span>
        <span className="shortcut-row-controls screenshots-shortcut-controls">
          <input
            {...technicalInputProps}
            aria-label={label}
            className="screenshot-shortcut-input"
            onChange={(event) =>
              updateShortcut(shortcutKey, enabledKey, event.currentTarget.value)
            }
            placeholder={t("settings.screenshotsShortcutPlaceholder")}
            value={value}
          />
          {value ? (
            <button
              aria-label={t("settings.shortcutClear")}
              className="shortcut-icon-button"
              onClick={() => updateShortcut(shortcutKey, enabledKey, "")}
              title={t("settings.shortcutClear")}
              type="button"
            >
              <X size={13} />
            </button>
          ) : null}
        </span>
      </div>
    );
  });
}
