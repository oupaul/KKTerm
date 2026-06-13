import {
  Cloud,
  Cpu,
  Database,
  Folder,
  Globe,
  HardDrive,
  ImagePlus,
  Monitor,
  Network,
  Pencil,
  RotateCcw,
  Server,
  Terminal as TerminalIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ConnectionIcon,
  PREDEFINED_CONNECTION_ICON_TYPES,
  connectionIconSrcForConnection,
} from "./ConnectionIcon";
import { connectionTypeLabel } from "./utils";
import { blobToDataUrl, resizeImageBlobToIconDataUrl } from "./iconImage";
import { ariaPressed, dialogButtonAria } from "../../../lib/aria";
import type { ConnectionType } from "../../../types";

const MAX_SOURCE_ICON_FILE_BYTES = 20 * 1024 * 1024;

type LucideIconChoice = {
  Icon: LucideIcon;
  label: string;
  svgBody: string;
};

const LUCIDE_ICON_CHOICES: LucideIconChoice[] = [
  {
    Icon: Server,
    label: "Server",
    svgBody:
      '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  },
  {
    Icon: TerminalIcon,
    label: "Terminal",
    svgBody: '<path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>',
  },
  {
    Icon: Database,
    label: "Database",
    svgBody:
      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  },
  {
    Icon: Network,
    label: "Network",
    svgBody:
      '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  },
  {
    Icon: Globe,
    label: "Globe",
    svgBody:
      '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  },
  {
    Icon: Cloud,
    label: "Cloud",
    svgBody: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  },
  {
    Icon: Monitor,
    label: "Monitor",
    svgBody:
      '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  },
  {
    Icon: HardDrive,
    label: "Hard drive",
    svgBody:
      '<path d="M10 16h.01"/><path d="M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><path d="M21.946 12.013H2.054"/><path d="M6 16h.01"/>',
  },
  {
    Icon: Cpu,
    label: "CPU",
    svgBody:
      '<path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  },
  {
    Icon: Folder,
    label: "Folder",
    svgBody:
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  },
];

function lucideIconDataUrl(svgBody: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function ConnectionIconPicker({
  customIconDataUrls,
  iconBackgroundColor,
  iconDataUrl,
  localShell,
  onChange,
  type,
}: {
  customIconDataUrls: string[];
  iconBackgroundColor?: string | null;
  iconDataUrl?: string | null;
  localShell?: string;
  onChange: (iconDataUrl: string | null) => void;
  type: ConnectionType;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentIconDataUrl = iconDataUrl ?? null;
  const defaultIconSrc = connectionIconSrcForConnection({ localShell, type });
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
          iconDataUrl={currentIconDataUrl}
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
          {currentIconDataUrl ? (
            <div className="connection-icon-picker-section">
              <p>{t("connections.customImage")}</p>
              <div className="connection-icon-current">
                <IconChoiceButton
                  active
                  ariaLabel={t("connections.currentCustomIcon")}
                  onClick={() => setOpen(false)}
                >
                  <img alt="" aria-hidden="true" src={currentIconDataUrl} />
                </IconChoiceButton>
                <button
                  aria-label={t("connections.removeCustomIcon")}
                  className="connection-icon-remove-button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : null}
          <div className="connection-icon-picker-section">
            <p>{t("connections.predefinedIcons")}</p>
            <div className="connection-icon-grid">
              <IconChoiceButton
                active={!currentIconDataUrl}
                ariaLabel={t("connections.useDefaultIcon")}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <ConnectionIcon localShell={localShell} size={22} type={type} />
              </IconChoiceButton>
              {PREDEFINED_CONNECTION_ICON_TYPES.map((iconType) => {
                const src = connectionIconSrcForConnection({ type: iconType });
                const label = connectionTypeLabel(iconType);
                return (
                  <IconChoiceButton
                    active={false}
                    ariaLabel={t("connections.selectPredefinedIcon", { icon: label })}
                    key={iconType}
                    onClick={() => void selectPredefinedIcon(src)}
                  >
                    <ConnectionIcon size={22} type={iconType} />
                  </IconChoiceButton>
                );
              })}
              <IconChoiceButton
                active={false}
                ariaLabel={t("connections.selectPredefinedIcon", { icon: t("connections.wsl") })}
                onClick={() =>
                  void selectPredefinedIcon(connectionIconSrcForConnection({ localShell: "wsl.exe", type: "local" }))
                }
              >
                <ConnectionIcon localShell="wsl.exe" size={22} type="local" />
              </IconChoiceButton>
            </div>
          </div>
          <div className="connection-icon-picker-section">
            <p>{t("connections.lucideIcons")}</p>
            <div className="connection-icon-grid">
              {LUCIDE_ICON_CHOICES.map((choice) => {
                const dataUrl = lucideIconDataUrl(choice.svgBody);
                const Icon = choice.Icon;
                return (
                  <IconChoiceButton
                    active={currentIconDataUrl === dataUrl}
                    ariaLabel={t("connections.selectLucideIcon", { icon: choice.label })}
                    key={choice.label}
                    onClick={() => {
                      onChange(dataUrl);
                      setOpen(false);
                    }}
                  >
                    <Icon aria-hidden="true" className="connection-icon-lucide-preview" size={20} />
                  </IconChoiceButton>
                );
              })}
            </div>
          </div>
          {reusableIconDataUrls.length > 0 ? (
            <div className="connection-icon-picker-section">
              <p>{t("connections.savedImages")}</p>
              <div className="connection-icon-grid">
                {reusableIconDataUrls.map((dataUrl, index) => (
                  <IconChoiceButton
                    active={false}
                    ariaLabel={t("connections.selectSavedIcon", { index: index + 1 })}
                    key={`${dataUrl}-${index}`}
                    onClick={() => {
                      onChange(dataUrl);
                      setOpen(false);
                    }}
                  >
                    <img alt="" aria-hidden="true" src={dataUrl} />
                  </IconChoiceButton>
                ))}
              </div>
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

function IconChoiceButton({
  active,
  ariaLabel,
  children,
  onClick,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="connection-icon-choice"
      onClick={onClick}
      type="button"
      {...ariaPressed(active)}
    >
      {children}
    </button>
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
