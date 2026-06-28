// A toolbar icon-button that opens the shared Dashboard background picker for an
// IT Ops drill view (fleet cards, server room, single rack). Reuses
// SharedBackgroundPopover end-to-end; the chosen background is persisted by the
// caller via `onChange` and rendered by <ItOpsBackground>.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SharedBackgroundPopover } from "../dashboard/edit/SharedBackgroundPopover";
import { loadBackgroundImage } from "../dashboard/state/persistence";
import type { DashboardBackground } from "../dashboard/types";
import { ItIcon } from "./icons";

export function BackgroundButton({
  background,
  onChange,
}: {
  background: DashboardBackground | null | undefined;
  onChange: (background: DashboardBackground | null) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="itops-bg-pop-wrap">
      <button
        type="button"
        className="it-icon-btn sm"
        title={t("itops.racks.changeBackground")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ItIcon name="image" size={14} />
      </button>
      {open ? (
        <SharedBackgroundPopover
          className="itops-bg-popover"
          background={background ?? null}
          titleKey="itops.racks.changeBackground"
          defaultHintKey="itops.racks.backgroundDefaultHint"
          onBackgroundChange={onChange}
          onLoadBackgroundImage={(file) => {
            void loadBackgroundImage(file);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
