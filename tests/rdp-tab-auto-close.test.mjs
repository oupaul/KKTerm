import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("RDP workspace does not install the removed ActiveX disconnect event sink", async () => {
  const remoteDesktopSource = await readFile(
    new URL("../src/modules/workspace/connections/remote-desktop/RemoteDesktopWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const rdpSource = await readFile(new URL("../src-tauri/src/rdp.rs", import.meta.url), "utf8");

  assert.doesNotMatch(
    remoteDesktopSource,
    /get_rdp_session_status/,
    "RDP disconnect detection should not poll session status",
  );
  assert.doesNotMatch(
    remoteDesktopSource,
    /rdp-session-event|RdpSessionEvent|closeRdpTabAfterRemoteDisconnect/,
    "RDP workspace should not listen for the removed backend event",
  );
  assert.doesNotMatch(
    rdpSource,
    /RdpEventSink|advise_rdp_events|FindConnectionPoint|IID_IMS_TSC_AX_EVENTS|DISPID_DISCONNECTED|rdp-session-event/,
    "RDP backend should not subscribe to or emit ActiveX disconnect events",
  );
});
