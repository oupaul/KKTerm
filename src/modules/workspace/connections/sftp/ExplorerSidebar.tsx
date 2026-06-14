// Finder/Explorer-style left navigation for the local file browser: Favorites
// (user-pinned, drag-to-reorder, pin/unpin) + Common Folders + Locations
// (drives with capacity). Collapses to zero width. Ported from the KKTerm
// redesign reference (explorer-sidebar.jsx) and wired to real local-filesystem
// places.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DIcon } from "../../../../app/ui/dialog";
import type { LocalDrivePlace, LocalPlace, LocalPlacesListing } from "../../../../lib/tauri";
import { formatFileSize } from "./format";
import { PlaceIcon, placeTintFor } from "./localPlaceGlyphs";
import type { LocalFavorite } from "./types";

type SectionKey = "favorites" | "common" | "locations";

export function samePath(left: string, right: string) {
  const normalize = (value: string) => {
    const trimmed = value.trim().replace(/[\\/]+$/, "");
    return /[\\]/.test(value) || /^[A-Za-z]:/.test(value) ? trimmed.toLowerCase() : trimmed;
  };
  return Boolean(left) && Boolean(right) && normalize(left) === normalize(right);
}

function SidebarRow({
  icon,
  label,
  active,
  onClick,
  meta,
  trailing,
  draggable,
  dragging,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  meta?: { freeBytes: number; totalBytes: number };
  trailing?: React.ReactNode;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnter?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const { t } = useTranslation();
  const usedPercent = meta && meta.totalBytes > 0
    ? Math.max(0, Math.min(100, Math.round(((meta.totalBytes - meta.freeBytes) / meta.totalBytes) * 100)))
    : 0;
  return (
    <button
      className={`sftp-sb-row${active ? " active" : ""}${meta ? " has-meta" : ""}${dragging ? " dragging" : ""}`}
      style={{ ["--sftp-sb-tint" as string]: placeTintFor(icon) }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      title={label}
      type="button"
    >
      <span className="ico">
        <PlaceIcon name={icon} size={17} />
      </span>
      {meta ? (
        <span className="stack">
          <span className="nm">{label}</span>
          <span className="cap">
            <i style={{ width: `${usedPercent}%` }} />
          </span>
          <span className="cap-txt">
            {t("sftp.sidebar.driveFree", {
              free: formatFileSize(meta.freeBytes),
              total: formatFileSize(meta.totalBytes),
            })}
          </span>
        </span>
      ) : (
        <span className="nm">{label}</span>
      )}
      {trailing}
    </button>
  );
}

function Section({
  label,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={`sftp-sb-section${collapsed ? " collapsed" : ""}`}>
      <button className="sftp-sb-header" onClick={onToggle} aria-expanded={!collapsed} type="button">
        <span className="tw">
          <DIcon name="chevright" size={11} />
        </span>
        <span className="lbl">{label}</span>
        <span className="hint">{collapsed ? t("sftp.sidebar.show") : t("sftp.sidebar.hide")}</span>
      </button>
      <div className="sftp-sb-list">{children}</div>
    </div>
  );
}

export function ExplorerSidebar({
  collapsed,
  currentPath,
  places,
  favorites,
  onNavigate,
  onAddFavorite,
  onRemoveFavorite,
  onReorderFavorites,
}: {
  collapsed: boolean;
  currentPath: string;
  places: LocalPlacesListing | null;
  favorites: LocalFavorite[];
  onNavigate: (path: string) => void;
  onAddFavorite: (place: { label: string; path: string; icon: string }) => void;
  onRemoveFavorite: (id: string) => void;
  onReorderFavorites: (next: LocalFavorite[]) => void;
}) {
  const { t } = useTranslation();
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<SectionKey, boolean>>({
    favorites: false,
    common: false,
    locations: false,
  });
  const toggleSection = (key: SectionKey) =>
    setSectionCollapsed((current) => ({ ...current, [key]: !current[key] }));

  const commonPlaces = useMemo<LocalPlace[]>(() => {
    if (!places) {
      return [];
    }
    return places.home ? [places.home, ...places.common] : places.common;
  }, [places]);
  const drives = places?.drives ?? [];

  const isPinned = (path: string) => favorites.some((favorite) => samePath(favorite.path, path));

  // drag-to-reorder favorites
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const handleDragStart = (id: string) => (event: React.DragEvent) => {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", id);
    } catch {
      /* ignore */
    }
  };
  const handleDragEnter = (index: number) => () => {
    if (dragId != null) {
      setOverIndex(index);
    }
  };
  const handleDragEnd = () => {
    if (dragId != null && overIndex != null) {
      const from = favorites.findIndex((favorite) => favorite.id === dragId);
      if (from >= 0) {
        const next = favorites.slice();
        const [moved] = next.splice(from, 1);
        let to = overIndex;
        if (from < to) {
          to -= 1;
        }
        next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
        onReorderFavorites(next);
      }
    }
    setDragId(null);
    setOverIndex(null);
  };

  return (
    <nav
      className={`sftp-sidebar${collapsed ? " collapsed" : ""}`}
      aria-label={t("sftp.sidebar.title")}
      aria-hidden={collapsed}
    >
      <Section
        label={t("sftp.sidebar.favorites")}
        collapsed={sectionCollapsed.favorites}
        onToggle={() => toggleSection("favorites")}
      >
        <div
          className={`sftp-sb-list reorder${dragId != null ? " dragging" : ""}`}
          style={{ position: "relative", padding: 0, display: "block" }}
        >
          {favorites.length === 0 ? (
            <div className="sftp-sb-empty">{t("sftp.sidebar.noFavorites")}</div>
          ) : null}
          {favorites.map((favorite, index) => (
            <div key={favorite.id} style={{ position: "relative" }}>
              {dragId != null && overIndex === index ? (
                <div className="sftp-sb-drop-line" style={{ top: -1 }} />
              ) : null}
              <SidebarRow
                icon={favorite.icon}
                label={favorite.label}
                active={samePath(favorite.path, currentPath)}
                onClick={() => onNavigate(favorite.path)}
                draggable
                dragging={dragId === favorite.id}
                onDragStart={handleDragStart(favorite.id)}
                onDragEnter={handleDragEnter(index)}
                onDragOver={(event) => event.preventDefault()}
                onDragEnd={handleDragEnd}
                trailing={
                  <span
                    role="button"
                    tabIndex={0}
                    className="act pinned"
                    title={t("sftp.sidebar.removeFavorite")}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveFavorite(favorite.id);
                    }}
                  >
                    <DIcon name="close" size={14} />
                  </span>
                }
              />
              {dragId != null && overIndex === index + 1 && index === favorites.length - 1 ? (
                <div className="sftp-sb-drop-line" style={{ bottom: -1 }} />
              ) : null}
            </div>
          ))}
          {dragId != null ? (
            <div
              style={{ height: 4 }}
              onDragEnter={handleDragEnter(favorites.length)}
              onDragOver={(event) => event.preventDefault()}
            />
          ) : null}
        </div>
      </Section>

      <Section
        label={t("sftp.sidebar.commonFolders")}
        collapsed={sectionCollapsed.common}
        onToggle={() => toggleSection("common")}
      >
        {commonPlaces.map((place) => {
          const pinned = isPinned(place.path);
          return (
            <SidebarRow
              key={place.id}
              icon={place.icon}
              label={place.label}
              active={samePath(place.path, currentPath)}
              onClick={() => onNavigate(place.path)}
              trailing={
                <span
                  role="button"
                  tabIndex={0}
                  className={`act${pinned ? " pinned" : ""}`}
                  title={pinned ? t("sftp.sidebar.inFavorites") : t("sftp.sidebar.addFavorite")}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (pinned) {
                      const favorite = favorites.find((entry) => samePath(entry.path, place.path));
                      if (favorite) {
                        onRemoveFavorite(favorite.id);
                      }
                    } else {
                      onAddFavorite({ label: place.label, path: place.path, icon: place.icon });
                    }
                  }}
                >
                  <DIcon name={pinned ? "check" : "plus"} size={14} />
                </span>
              }
            />
          );
        })}
        {commonPlaces.length === 0 ? (
          <div className="sftp-sb-empty">{t("sftp.sidebar.loadingPlaces")}</div>
        ) : null}
      </Section>

      {drives.length > 0 ? (
        <Section
          label={t("sftp.sidebar.locations")}
          collapsed={sectionCollapsed.locations}
          onToggle={() => toggleSection("locations")}
        >
          {drives.map((drive: LocalDrivePlace) => (
            <SidebarRow
              key={drive.id}
              icon={drive.icon}
              label={drive.label}
              active={samePath(drive.path, currentPath)}
              onClick={() => onNavigate(drive.path)}
              meta={{ freeBytes: drive.freeBytes, totalBytes: drive.totalBytes }}
            />
          ))}
        </Section>
      ) : null}
    </nav>
  );
}
