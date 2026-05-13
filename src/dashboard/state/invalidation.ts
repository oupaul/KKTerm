import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../../lib/tauri";
import { useDashboardStore } from "./dashboardStore";

const DASHBOARD_CHANGED_EVENT = "dashboard-changed";

export function useDashboardBackendInvalidation() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void listen(DASHBOARD_CHANGED_EVENT, () => {
      void useDashboardStore.getState().load();
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
        } else {
          unlisten = cleanup;
        }
      })
      .catch(() => {
        // Dashboard still refreshes from the assistant streaming tool lifecycle.
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
