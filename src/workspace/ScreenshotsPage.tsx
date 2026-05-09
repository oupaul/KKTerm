import { Copy, Grid2X2, List, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspaceStore } from "../store";
import {
  clearStoredScreenshots,
  deleteStoredScreenshot,
  listStoredScreenshots,
  subscribeToScreenshotChanges,
  type StoredScreenshot,
} from "./screenshotLibrary";

type ScreenshotViewMode = "grid" | "list";

export function ScreenshotsPage() {
  const { t } = useTranslation();
  const showWorkspaceStatus = useWorkspaceStore((state) => state.showWorkspaceStatus);
  const [screenshots, setScreenshots] = useState<StoredScreenshot[]>([]);
  const [viewMode, setViewMode] = useState<ScreenshotViewMode>("grid");

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  useEffect(() => {
    let disposed = false;
    async function refreshScreenshots() {
      try {
        const nextScreenshots = await listStoredScreenshots();
        if (!disposed) {
          setScreenshots(nextScreenshots);
        }
      } catch (error) {
        if (!disposed) {
          const message = error instanceof Error ? error.message : String(error);
          showWorkspaceStatus(t("screenshots.loadError", { message }), { tone: "error" });
        }
      }
    }

    void refreshScreenshots();
    const unsubscribe = subscribeToScreenshotChanges(() => void refreshScreenshots());
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [showWorkspaceStatus, t]);

  async function copyScreenshot(screenshot: StoredScreenshot) {
    try {
      const response = await fetch(screenshot.dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/jpeg"]: blob }),
      ]);
      showWorkspaceStatus(t("screenshots.copySuccess"), { tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showWorkspaceStatus(t("screenshots.copyError", { message }), { tone: "error" });
    }
  }

  async function deleteScreenshot(id: string) {
    try {
      await deleteStoredScreenshot(id);
      showWorkspaceStatus(t("screenshots.deleteSuccess"), { tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showWorkspaceStatus(t("screenshots.deleteError", { message }), { tone: "error" });
    }
  }

  async function clearScreenshots() {
    try {
      await clearStoredScreenshots();
      showWorkspaceStatus(t("screenshots.clearSuccess"), { tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showWorkspaceStatus(t("screenshots.deleteError", { message }), { tone: "error" });
    }
  }

  return (
    <main className="screenshots-page" role="region" aria-label={t("screenshots.title")}>
      <header className="screenshots-header">
        <div>
          <h1>{t("screenshots.title")}</h1>
          <p>{t("screenshots.subtitle")}</p>
        </div>
        <div className="screenshots-actions" role="toolbar" aria-label={t("screenshots.viewOptions")}>
          <button
            aria-label={t("screenshots.gridView")}
            aria-pressed={viewMode === "grid"}
            className="icon-button"
            onClick={() => setViewMode("grid")}
            type="button"
          >
            <Grid2X2 size={16} />
          </button>
          <button
            aria-label={t("screenshots.listView")}
            aria-pressed={viewMode === "list"}
            className="icon-button"
            onClick={() => setViewMode("list")}
            type="button"
          >
            <List size={16} />
          </button>
          <button
            className="secondary-button"
            disabled={screenshots.length === 0}
            onClick={() => void clearScreenshots()}
            type="button"
          >
            {t("screenshots.clearAll")}
          </button>
        </div>
      </header>
      {screenshots.length === 0 ? (
        <section className="screenshots-empty" aria-label={t("screenshots.emptyTitle")}>
          <h2>{t("screenshots.emptyTitle")}</h2>
          <p>{t("screenshots.emptyHint")}</p>
        </section>
      ) : (
        <section
          className={`screenshots-collection screenshots-${viewMode}`}
          aria-label={t("screenshots.collection")}
        >
          {screenshots.map((screenshot) => (
            <article className="screenshot-card" key={screenshot.id}>
              <div className="screenshot-preview">
                <img alt={screenshot.label} src={screenshot.dataUrl} />
              </div>
              <div className="screenshot-details">
                <strong>{screenshot.label}</strong>
                <span>
                  {t("screenshots.metadata", {
                    dimensions: `${screenshot.width} x ${screenshot.height}`,
                    capturedAt: dateFormatter.format(new Date(screenshot.capturedAt)),
                  })}
                </span>
              </div>
              <div className="screenshot-card-actions">
                <button
                  aria-label={t("screenshots.copyScreenshot")}
                  className="icon-button"
                  onClick={() => void copyScreenshot(screenshot)}
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button
                  aria-label={t("screenshots.deleteScreenshot")}
                  className="icon-button danger"
                  onClick={() => void deleteScreenshot(screenshot.id)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
