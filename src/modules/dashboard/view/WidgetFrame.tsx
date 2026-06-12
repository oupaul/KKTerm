import { Settings as SettingsIcon, X as XIcon } from "lucide-react";
import * as Icons from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { showNativeContextMenu, type NativeContextMenuPosition } from "../../../lib/nativeContextMenu";
import { nativeMenuIcons } from "../../../lib/nativeMenuIcons";
import { useDashboardStore } from "../state/dashboardStore";
import { getBuiltInWidget } from "../registry/builtInRegistry";
import { PRESET_RENDERERS } from "../registry/presetRegistry";
import { resolveAccent } from "../registry/palette";
import { effectiveBodyOpacity } from "../types";
import type { DashboardWidgetInstance } from "../types";
import { WidgetBody } from "./WidgetBody";

export interface WidgetFrameProps {
  instance: DashboardWidgetInstance;
  isViewActive: boolean;
  onCustomize: (instance: DashboardWidgetInstance, anchor: HTMLElement) => void;
  onRequestDelete: (request: DashboardWidgetDeleteRequest) => void;
  suppressNativeWebviews: boolean;
}

export interface DashboardWidgetDeleteRequest {
  instanceId: string;
  title: string;
}

export function WidgetFrame({
  instance,
  isViewActive,
  onCustomize,
  onRequestDelete,
  suppressNativeWebviews,
}: WidgetFrameProps) {
  const { t } = useTranslation();
  const editMode = useDashboardStore((s) => s.editMode);
  const updateInstance = useDashboardStore((s) => s.updateInstance);
  const customWidgets = useDashboardStore((s) => s.customWidgets);
  const agentCreatedRevealInstanceIds = useDashboardStore((s) => s.agentCreatedRevealInstanceIds);
  const clearAgentCreatedReveal = useDashboardStore((s) => s.clearAgentCreatedReveal);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const shouldSpaceWarp = agentCreatedRevealInstanceIds.includes(instance.id);

  const accent = resolveAccent(instance.accentName);
  const Render = PRESET_RENDERERS[instance.preset];

  const builtIn = instance.kind === "builtIn" ? getBuiltInWidget(instance.sourceId) : undefined;
  const customSource =
    instance.kind !== "builtIn" ? customWidgets.find((c) => c.id === instance.sourceId) : undefined;

  const fallbackTitle =
    instance.customTitle
    ?? (builtIn ? t(builtIn.titleKey) : undefined)
    ?? customSource?.title
    ?? t("dashboard.untitledWidget");

  const IconCmp = (Icons as unknown as Record<string, React.ComponentType<{ width?: number; height?: number }>>)[instance.iconName] ?? Icons.Hash;

  useEffect(() => {
    if (!shouldSpaceWarp) return;
    const timer = setTimeout(() => clearAgentCreatedReveal(instance.id), 1000);
    return () => clearTimeout(timer);
  }, [clearAgentCreatedReveal, instance.id, shouldSpaceWarp]);

  function handleRemoveClick(e: React.MouseEvent) {
    e.stopPropagation();
    onRequestDelete({ instanceId: instance.id, title: fallbackTitle });
  }

  async function openWidgetContextMenu(position: NativeContextMenuPosition) {
    await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("dashboard.properties"),
          iconSvg: nativeMenuIcons.settings,
          action: () => {
            if (frameRef.current) onCustomize(instance, frameRef.current);
          },
        },
        {
          kind: "item",
          label: t("common.delete"),
          iconSvg: nativeMenuIcons.trash,
          action: () => onRequestDelete({ instanceId: instance.id, title: fallbackTitle }),
        },
      ],
      position,
    );
  }

  function handleWidgetContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    void openWidgetContextMenu({ x: e.clientX, y: e.clientY });
  }

  const controls: ReactNode = (
    <span className="dw-controls">
      <button
        className="dw-ctrl dw-ctrl-properties"
        onClick={(e) => { e.stopPropagation(); onCustomize(instance, e.currentTarget); }}
        aria-label={t("dashboard.customize")}
        title={t("dashboard.customize")}
        type="button"
      >
        <SettingsIcon width={12} height={12} />
      </button>
      {editMode ? (
        <button
          className="dw-ctrl danger"
          onClick={handleRemoveClick}
          aria-label={t("dashboard.removeWidget", { name: fallbackTitle })}
          title={t("dashboard.removeWidget", { name: fallbackTitle })}
          type="button"
        >
          <XIcon width={12} height={12} />
        </button>
      ) : null}
    </span>
  );

  const style: CSSProperties = {
    // expose CSS variables consumed by preset chrome
    ["--w-accent" as unknown as string]: accent.color,
    ["--w-accent-soft" as unknown as string]: accent.soft,
    ["--w-title-text" as unknown as string]: accent.titleText,
    ["--w-body-opacity" as unknown as string]: effectiveBodyOpacity(instance),
  } as CSSProperties;

  const className = [
    "dw-instance",
    instance.kind !== "builtIn" ? "dw-custom-widget" : "",
    shouldSpaceWarp ? "dw-reveal-space-warp" : "",
    editMode ? "dw-edit" : "",
    editMode ? "drag-handle" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={frameRef}
      className={className}
      data-dashboard-widget-instance-id={instance.id}
      onContextMenu={handleWidgetContextMenu}
      style={style}
    >
      <Render
        title={fallbackTitle}
        icon={<IconCmp width={14} height={14} />}
        body={(
          <WidgetBody
            instance={instance}
            isViewActive={isViewActive}
            onWidgetContextMenu={openWidgetContextMenu}
            suppressNativeWebviews={suppressNativeWebviews}
          />
        )}
        controls={controls}
        editMode={editMode}
        glass={instance.glass}
        hideTitle={instance.hideTitle}
        onTitleCommit={(next) => { void updateInstance(instance.id, { customTitle: next }); }}
      />
    </div>
  );
}
