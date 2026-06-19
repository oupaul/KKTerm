// Per-host transport chip (SSH / WinRM / PsExec / Auto). The transport id is a
// technical token rendered verbatim, not translatable chrome.

import { ItIcon, type ItIconName } from "./icons";
import type { Transport } from "./data";

const TRANSPORT_ICON: Record<Transport, ItIconName> = {
  ssh: "ssh",
  winrm: "windows",
  psexec: "psexec",
  auto: "server",
};

export function TransportChip({ transport }: { transport: Transport }) {
  return (
    <span className={`tport ${transport}`}>
      <span className="tport-ic">
        <ItIcon name={TRANSPORT_ICON[transport]} size={12} />
      </span>
      {transport}
    </span>
  );
}
