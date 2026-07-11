import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../../lib/tauri";
import { useItOpsStore } from "./state";

const ITOPS_CHANGED_EVENT = "itops-changed";

// Reload IT Ops data when the backend reports a mutation from outside this
// UI (the AI assistant's itops_* tools or the built-in MCP kkterm.itops.*
// bridge). Mirrors the Dashboard's dashboard-changed invalidation.
export function useItOpsBackendInvalidation() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void listen(ITOPS_CHANGED_EVENT, () => {
      const store = useItOpsStore.getState();
      if (store.loaded) {
        void store.loadSites();
      }
      for (const siteId of Object.keys(store.serverRoomsBySite)) {
        void store.loadServerRooms(siteId);
      }
      for (const siteId of Object.keys(store.racksBySite)) {
        void store.loadRacks(siteId);
      }
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
        } else {
          unlisten = cleanup;
        }
      })
      .catch(() => {
        // IT Ops pages still reload on navigation when the listener fails.
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
