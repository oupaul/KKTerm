// Rack-device connect popover (docs/SITE.md Rack View). Clicking a placed
// device with bound Connections opens this faceplate-anchored popover listing
// every binding (primary placement first, then the additional bindings). A row
// without an open Session connects; DOM-rendered surfaces (terminals, file
// browsers, documents) open in the background so the user can keep working the
// rack, while native-surface kinds (URL/RDP/VNC) must come up while the
// Workspace is visible, so those navigate there. A row whose Session is
// already open becomes "Go to session" and jumps to its Workspace tab.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogPortal } from "../../app/DialogPortal";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Connection, RackItem } from "../../types";
import { ConnectionIcon } from "../workspace/connections/ConnectionIcon";
import { isRemoteDesktopConnectionType } from "../workspace/connections/utils";
import { collectBoundConnectionIds } from "./rackInventory";

export interface ConnectPopoverAnchor {
  top: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

// Popover distance from the faceplate edge / viewport edges.
const GAP = 10;
const VIEWPORT_PAD = 8;

export function RackItemConnectPopover({
  item,
  anchor,
  onClose,
  onShowWorkspace,
}: {
  item: RackItem;
  anchor: ConnectPopoverAnchor;
  onClose: () => void;
  /** Navigate the app shell to the Workspace Module. */
  onShowWorkspace: () => void;
}) {
  const { t } = useTranslation();
  const tabs = useWorkspaceStore((state) => state.tabs);
  const openConnection = useWorkspaceStore((state) => state.openConnection);
  const activateTab = useWorkspaceStore((state) => state.activateTab);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [rows, setRows] = useState<{ id: string; connection: Connection | null }[] | null>(null);

  const boundIds = collectBoundConnectionIds(item);
  const boundKey = boundIds.join("|");

  useEffect(() => {
    if (!isTauriRuntime()) {
      setRows(boundIds.map((id) => ({ id, connection: null })));
      return;
    }
    let disposed = false;
    void Promise.all(
      boundIds.map(async (id) => {
        try {
          const connection = await invokeCommand("itops_get_connection", { id });
          return { id, connection };
        } catch {
          // Soft reference: the bound Connection may have been deleted.
          return { id, connection: null };
        }
      }),
    ).then((loaded) => {
      if (!disposed) setRows(loaded);
    });
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundKey, item.id]);

  // Place beside the faceplate (right first, flipped left when cramped) and
  // clamp inside the viewport; re-run when rows load and the box resizes.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const { width, height } = box.getBoundingClientRect();
    let left = anchor.right + GAP;
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = anchor.left - width - GAP;
    }
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD));
    const top = Math.max(
      VIEWPORT_PAD,
      Math.min(
        anchor.top + anchor.height / 2 - height / 2,
        window.innerHeight - height - VIEWPORT_PAD,
      ),
    );
    setPosition({ top, left });
  }, [anchor, rows]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function tabFor(connectionId: string) {
    return tabs.find((tab) => tab.connection?.id === connectionId);
  }

  function activateRow(connection: Connection) {
    const tab = tabFor(connection.id);
    if (tab) {
      activateTab(tab.id);
      onShowWorkspace();
      onClose();
      return;
    }
    openConnection(connection);
    if (connection.type === "url" || isRemoteDesktopConnectionType(connection.type)) {
      // Native-surface Sessions (WebView2/RDP/VNC) must come up while the
      // Workspace is visible; see docs/ARCHITECTURE.md native-window rules.
      onShowWorkspace();
      onClose();
      return;
    }
    showStatusBarNotice(t("itops.racks.connectOpenedNotice", { name: connection.name }), {
      tone: "success",
    });
  }

  const title = item.label || t(`itops.racks.kind.${item.kind}`);

  return (
    <DialogPortal>
      <div className="rkc-backdrop" onClick={onClose} />
      <div
        className="rkc-pop"
        ref={boxRef}
        role="dialog"
        aria-label={title}
        style={
          position
            ? { top: position.top, left: position.left }
            : { top: anchor.top, left: anchor.right + GAP, visibility: "hidden" }
        }
      >
        <div className="rkc-head">
          <span className="rkc-title">{title}</span>
          <span className="rkc-count">
            {t("itops.racks.boundConnectionCount", { count: boundIds.length })}
          </span>
        </div>
        <div className="rkc-rows">
          {(rows ?? []).map(({ id, connection }) => {
            if (!connection) {
              return (
                <div className="rkc-row missing" key={id}>
                  <span className="rkc-row-name">{t("itops.racks.ghostBadge")}</span>
                </div>
              );
            }
            const open = !!tabFor(connection.id);
            return (
              <button
                type="button"
                className="rkc-row"
                key={id}
                onClick={() => activateRow(connection)}
              >
                <ConnectionIcon
                  iconBackgroundColor={connection.iconBackgroundColor}
                  iconColor={connection.iconColor}
                  iconDataUrl={connection.iconDataUrl}
                  localShell={connection.localShell}
                  size={16}
                  type={connection.type}
                />
                <span className="rkc-row-txt">
                  <span className="rkc-row-name">{connection.name}</span>
                  {connection.host ? <span className="rkc-row-host">{connection.host}</span> : null}
                </span>
                <span className={`rkc-row-act${open ? " open" : ""}`}>
                  {open ? <span className="rkc-live-dot" /> : null}
                  {open ? t("itops.racks.goToSessionAction") : t("itops.racks.connectAction")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </DialogPortal>
  );
}
