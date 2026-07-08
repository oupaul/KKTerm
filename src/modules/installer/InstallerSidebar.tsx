// Install Helper category rail — the Finder/SFTP-style left navigation.
// STATUS filters (All / Installed / Updates / Not Installed) over the catalog,
// then CATEGORIES (the visibility sections from sections.ts) with live counts.
// Selecting a row drives the InstallerPage `nav` filter; counts are computed
// once by the page and passed down so the rail and content always agree.

import {
  CircleArrowUp,
  CircleCheck,
  CircleDashed,
  Layers,
} from "../../lib/reicon";
import type { LucideIcon } from "../../lib/reicon";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { INSTALLER_CATEGORY_SECTIONS } from "./sections";

export type InstallerNav =
  | "all"
  | "installed"
  | "updates"
  | "none"
  | `sec:${string}`;

export interface InstallerCounts {
  all: number;
  installed: number;
  updates: number;
  none: number;
  byCategory: Record<string, number>;
}

function SbRow({
  Icon,
  tint,
  label,
  count,
  active,
  dot,
  onClick,
}: {
  Icon: LucideIcon;
  tint: string;
  label: string;
  count: number;
  active: boolean;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`installer-sb-row${active ? " active" : ""}`}
      style={{ "--tint": tint } as CSSProperties}
      onClick={onClick}
      title={label}
      aria-pressed={active}
    >
      <span className="installer-sb-row__ico">
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="installer-sb-row__nm">{label}</span>
      {dot ? <span className="installer-sb-row__dot" aria-hidden="true" /> : null}
      <span className="installer-sb-row__count">{count}</span>
    </button>
  );
}

export function InstallerSidebar({
  nav,
  onNavigate,
  counts,
  collapsed,
}: {
  nav: InstallerNav;
  onNavigate: (nav: InstallerNav) => void;
  counts: InstallerCounts;
  collapsed: boolean;
}) {
  const { t } = useTranslation();
  return (
    <nav
      className={`installer-rail${collapsed ? " collapsed" : ""}`}
      aria-hidden={collapsed}
      aria-label={t("installer.sidebar.categories")}
    >
      <div className="installer-rail__section">
        <div className="installer-rail__head">
          {t("installer.sidebar.status")}
        </div>
        <div className="installer-rail__list">
          <SbRow
            Icon={Layers}
            tint="var(--accent)"
            label={t("installer.sidebar.allTools")}
            count={counts.all}
            active={nav === "all"}
            onClick={() => onNavigate("all")}
          />
          <SbRow
            Icon={CircleCheck}
            tint="var(--green)"
            label={t("installer.section.installed")}
            count={counts.installed}
            active={nav === "installed"}
            onClick={() => onNavigate("installed")}
          />
          <SbRow
            Icon={CircleArrowUp}
            tint="var(--accent)"
            label={t("installer.sidebar.updates")}
            count={counts.updates}
            dot={counts.updates > 0}
            active={nav === "updates"}
            onClick={() => onNavigate("updates")}
          />
          <SbRow
            Icon={CircleDashed}
            tint="var(--text-faint)"
            label={t("installer.status.notInstalled")}
            count={counts.none}
            active={nav === "none"}
            onClick={() => onNavigate("none")}
          />
        </div>
      </div>

      <div className="installer-rail__section">
        <div className="installer-rail__head">
          {t("installer.sidebar.categories")}
        </div>
        <div className="installer-rail__list">
          {INSTALLER_CATEGORY_SECTIONS.map((section) => (
            <SbRow
              key={section.id}
              Icon={section.Icon}
              tint={`var(${section.tintVar})`}
              label={t(section.titleKey)}
              count={counts.byCategory[section.id] ?? 0}
              active={nav === `sec:${section.id}`}
              onClick={() => onNavigate(`sec:${section.id}`)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
