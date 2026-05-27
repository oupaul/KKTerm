import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../state/dashboardStore";
import { getBuiltInWidget } from "../registry/builtInRegistry";
import { ScriptWidgetHost } from "../script/ScriptWidgetHost";
import type { DashboardWidgetInstance } from "../types";
import type { NativeContextMenuPosition } from "../../../lib/nativeContextMenu";

export function WidgetBody({
  isViewActive,
  instance,
  onWidgetContextMenu,
  suppressNativeWebviews,
}: {
  isViewActive: boolean;
  instance: DashboardWidgetInstance;
  onWidgetContextMenu: (position: NativeContextMenuPosition) => void | Promise<void>;
  suppressNativeWebviews: boolean;
}) {
  const { t } = useTranslation();
  const customWidgets = useDashboardStore((s) => s.customWidgets);

  if (instance.kind === "builtIn") {
    const entry = getBuiltInWidget(instance.sourceId);
    if (!entry) {
      return (
        <div className="dw-missing">
          {t("dashboard.missingBuiltInWidget", { sourceId: instance.sourceId })}
        </div>
      );
    }
    const { Body } = entry;
    return (
      <Body
        instance={instance}
        isViewActive={isViewActive}
        suppressNativeWebviews={suppressNativeWebviews}
      />
    );
  }
  const cw = customWidgets.find((c) => c.id === instance.sourceId);
  if (!cw) {
    return (
      <div className="dw-missing">
        {t("dashboard.missingCustomWidget", { sourceId: instance.sourceId })}
      </div>
    );
  }

  return (
    <ScriptWidgetHost
      bodyJson={cw.bodyJson}
      isViewActive={isViewActive}
      instance={instance}
      onWidgetContextMenu={onWidgetContextMenu}
      settingsSchemaJson={cw.settingsSchemaJson}
    />
  );
}
