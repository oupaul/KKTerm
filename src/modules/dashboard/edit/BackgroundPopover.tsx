import { useDashboardStore } from "../state/dashboardStore";
import type { DashboardView } from "../types";
import { SharedBackgroundPopover } from "./SharedBackgroundPopover";

export interface BackgroundPopoverProps {
  view: DashboardView;
  onClose: () => void;
}

export function BackgroundPopover({ view, onClose }: BackgroundPopoverProps) {
  const setViewBackground = useDashboardStore((s) => s.setViewBackground);
  const loadBackgroundImage = useDashboardStore((s) => s.loadBackgroundImage);

  return (
    <SharedBackgroundPopover
      background={view.background}
      titleKey="dashboard.changeBackground"
      defaultHintKey="dashboard.backgroundDefaultHint"
      onBackgroundChange={(background) => setViewBackground(view.id, background)}
      onLoadBackgroundImage={loadBackgroundImage}
      onClose={onClose}
    />
  );
}
