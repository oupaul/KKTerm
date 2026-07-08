import { ImagePlus, Pencil, RotateCcw } from "../../../lib/reicon";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconLibraryPicker, type IconLibraryStaticOption } from "../../../app/IconLibraryPicker";
import { BRAND_ICON_ENTRIES, brandIconRefForId } from "../../../lib/brandIcons";
import { reiconIconRefForName } from "../../../lib/iconCatalog";
import { OS_ICON_ENTRIES, osIconRefForId } from "../../../lib/osIcons";
import {
  ConnectionIcon,
  PREDEFINED_CONNECTION_ICON_TYPES,
  connectionIconSrcForConnection,
  iconSupportsForegroundColor,
} from "./ConnectionIcon";
import { ConnectionIconColorPicker } from "./ConnectionIconBackgroundPicker";
import { connectionTypeLabel } from "./utils";
import { blobToDataUrl, resizeImageBlobToIconDataUrl } from "./iconImage";
import { dialogButtonAria } from "../../../lib/aria";
import { ICON_NAMES } from "../../dashboard/types";
import type { ConnectionType } from "../../../types";

const MAX_SOURCE_ICON_FILE_BYTES = 20 * 1024 * 1024;

export function ConnectionIconPicker({
  customIconDataUrls,
  defaultIconDataUrl,
  defaultIconLabel,
  defaultIconKeywords,
  iconBackgroundColor,
  iconColor,
  iconDataUrl,
  localShell,
  onChange,
  onIconColorChange,
  type,
}: {
  customIconDataUrls: string[];
  defaultIconDataUrl?: string | null;
  defaultIconLabel?: string;
  defaultIconKeywords?: string[];
  iconBackgroundColor?: string | null;
  iconColor?: string | null;
  iconDataUrl?: string | null;
  localShell?: string;
  onChange: (iconDataUrl: string | null) => void;
  onIconColorChange?: (iconColor: string | null) => void;
  type: ConnectionType;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentIconDataUrl = iconDataUrl ?? null;
  const previewIconDataUrl = currentIconDataUrl ?? defaultIconDataUrl ?? null;
  const supportsForeground = iconSupportsForegroundColor({ iconDataUrl: previewIconDataUrl, localShell, type });
  const currentSavedImageDataUrl = currentIconDataUrl?.startsWith("data:image/") ? currentIconDataUrl : null;
  const defaultIconSrc = connectionIconSrcForConnection({ localShell, type });
  const predefinedOptions = useMemo(
    () => connectionPredefinedIconOptions(t, type, localShell),
    [localShell, t, type],
  );
  const reusableIconDataUrls = useMemo(
    () => customIconDataUrls.filter((dataUrl) => dataUrl !== currentIconDataUrl),
    [customIconDataUrls, currentIconDataUrl],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function selectPredefinedIcon(src: string) {
    setError("");
    if (src === defaultIconSrc) {
      onChange(null);
      setOpen(false);
      return;
    }

    try {
      onChange(await imageSourceToDataUrl(src));
      setOpen(false);
    } catch {
      setError(t("connections.iconReadError"));
    }
  }

  // Keep the popover open after picking a foreground-capable line icon so the
  // foreground swatches appear and the user can recolor it in one flow; close it
  // after picking an image icon that ignores the foreground color.
  function closeAfterSelect(nextValue: string | null) {
    const effective = nextValue ?? defaultIconDataUrl ?? null;
    if (onIconColorChange && iconSupportsForegroundColor({ iconDataUrl: effective, localShell, type })) {
      return;
    }
    setOpen(false);
  }

  async function handleSelectIcon(nextIcon: string | null) {
    setError("");
    if (!nextIcon) {
      onChange(null);
      closeAfterSelect(null);
      return;
    }
    if (nextIcon.startsWith("connection:")) {
      const src = connectionIconSourceForPickerValue(nextIcon);
      if (!src) {
        return;
      }
      await selectPredefinedIcon(src);
      return;
    }
    onChange(nextIcon);
    closeAfterSelect(nextIcon);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }
    setError("");
    if (file.size > MAX_SOURCE_ICON_FILE_BYTES) {
      setError(t("connections.iconFileTooLarge"));
      return;
    }
    try {
      onChange(await resizeImageBlobToIconDataUrl(file));
      setOpen(false);
    } catch {
      setError(t("connections.iconReadError"));
    }
  }

  return (
    <div className="connection-icon-editor" ref={rootRef}>
      <button
        aria-label={t("connections.editIcon")}
        className="connection-icon-edit-button"
        onClick={() => {
          setError("");
          setOpen((current) => !current);
        }}
        type="button"
        {...dialogButtonAria(open)}
      >
        <ConnectionIcon
          iconBackgroundColor={iconBackgroundColor}
          iconColor={iconColor}
          iconDataUrl={previewIconDataUrl}
          localShell={localShell}
          size={44}
          type={type}
        />
        <span className="connection-icon-edit-glyph" aria-hidden="true">
          <Pencil size={12} />
        </span>
      </button>
      {open ? (
        <div className="connection-icon-popover" role="dialog" aria-label={t("connections.iconPickerLabel")}>
          <IconLibraryPicker
            defaultOption={{
              value: null,
              label: defaultIconLabel ?? t("connections.useDefaultIcon"),
              keywords: defaultIconKeywords ?? [connectionTypeLabel(type), "default"],
              icon: (
                <ConnectionIcon
                  iconColor={iconColor}
                  iconDataUrl={defaultIconDataUrl}
                  localShell={localShell}
                  size={22}
                  type={type}
                />
              ),
            }}
            iconNames={ICON_NAMES}
            iconValueForName={reiconIconRefForName}
            onSelect={(nextIcon) => {
              void handleSelectIcon(nextIcon);
            }}
            savedImageLabelForIndex={(index) => t("connections.selectSavedIcon", { index: index + 1 })}
            savedImageDataUrls={currentSavedImageDataUrl ? [currentSavedImageDataUrl, ...reusableIconDataUrls] : reusableIconDataUrls}
            searchPlaceholder={t("common.searchForMore")}
            staticOptions={predefinedOptions}
            value={currentIconDataUrl}
          />
          {onIconColorChange && supportsForeground ? (
            <div className="connection-icon-picker-section connection-icon-foreground-section">
              <p>{t("connections.iconForeground")}</p>
              <ConnectionIconColorPicker color={iconColor} kind="foreground" onChange={onIconColorChange} />
            </div>
          ) : null}
          <div className="connection-icon-picker-actions">
            <button className="toolbar-button" onClick={() => fileInputRef.current?.click()} type="button">
              <ImagePlus size={15} />
              {t("connections.chooseImage")}
            </button>
            <button className="toolbar-button" onClick={() => onChange(null)} type="button">
              <RotateCcw size={15} />
              {t("common.reset")}
            </button>
          </div>
          <input
            accept="image/*"
            aria-label={t("connections.chooseImage")}
            className="connection-icon-file-input"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

async function imageSourceToDataUrl(src: string) {
  if (src.startsWith("data:image/")) {
    return src;
  }
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("icon fetch failed");
  }
  return blobToDataUrl(await response.blob());
}

function connectionPredefinedIconOptions(
  t: ReturnType<typeof useTranslation>["t"],
  type: ConnectionType,
  localShell?: string,
): IconLibraryStaticOption[] {
  return [
    ...PREDEFINED_CONNECTION_ICON_TYPES.map((iconType) => ({
      value: `connection:${iconType}`,
      label: connectionTypeLabel(iconType),
      keywords: [iconType],
      icon: <ConnectionIcon localShell={iconType === "local" ? localShell : undefined} size={22} type={iconType} />,
    })),
    {
      value: "connection:local:wsl",
      label: t("connections.wsl"),
      keywords: ["linux", "shell", "wsl"],
      icon: <ConnectionIcon localShell="wsl.exe" size={22} type="local" />,
    },
    ...BRAND_ICON_ENTRIES.map((entry) => ({
      value: brandIconRefForId(entry.id),
      label: entry.label,
      keywords: entry.keywords,
      icon: <ConnectionIcon iconDataUrl={brandIconRefForId(entry.id)} size={22} type={type} />,
    })),
    ...OS_ICON_ENTRIES.map((entry) => ({
      value: osIconRefForId(entry.id),
      label: entry.label,
      keywords: entry.keywords,
      icon: <ConnectionIcon iconDataUrl={osIconRefForId(entry.id)} size={22} type={type} />,
    })),
  ];
}

function connectionIconSourceForPickerValue(value: string) {
  if (value === "connection:local:wsl") {
    return connectionIconSrcForConnection({ localShell: "wsl.exe", type: "local" });
  }
  const type = value.slice("connection:".length) as ConnectionType;
  if (!PREDEFINED_CONNECTION_ICON_TYPES.includes(type)) {
    return null;
  }
  return connectionIconSrcForConnection({ type });
}
