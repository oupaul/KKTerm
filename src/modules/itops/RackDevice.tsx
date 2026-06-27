// Animated rack-device faceplate (docs/FLEET.md Rack View). A presentation-only
// port of the "IT Ops Racks" design comp: each RackItemKind paints its own
// skeuomorphic 1U face — server fans + drive LEDs, switch/router port blink,
// firewall shield + throughput bars, storage disk grid, PDU outlets + load
// meter, UPS battery cells, KVM channels, patch panel, blanking plate. Status
// drives the LED column and dims an offline device. Port/disk "activity" is
// seeded from the item id so it stays stable across renders (no live polling).
//
// Hardware greys read the `--rkd-*` vars defined on `.rkd` in itops.css (a fixed
// physical-hardware palette, like the terminal surfaces); status/accent colour
// reads the shared theme tokens.

import type { RackItemKind, RackItemStatus } from "../../types";

export interface RackDeviceProps {
  kind: RackItemKind;
  label: string;
  /** Secondary line — a placed Connection's host/ip, when known. */
  subLabel?: string | null;
  status: RackItemStatus;
  ports?: number | null;
  disks?: number | null;
  battery?: number | null;
  load?: number | null;
  heightU: number;
  /** User accent override; falls back to the per-kind device colour. */
  accent?: string | null;
  /** Stable seed (the rack item id) for deterministic activity flicker. */
  seed: string;
}

// Per-kind device accent (used when the item has no explicit accent override).
const KIND_ACCENT: Record<RackItemKind, string> = {
  server: "#0a84ff",
  connection: "#0a84ff",
  storage: "#5e5ce6",
  switch: "#30d158",
  router: "#30b0c7",
  firewall: "#ff453a",
  pdu: "#ff9f0a",
  ups: "#bf5af2",
  kvm: "#64d2ff",
  patchPanel: "#8e8e93",
  blank: "#48484a",
  label: "#48484a",
  general: "#8e8e93",
  equipment: "#8e8e93",
};

// FNV-1a hash → small-PRNG, mirrored from the comp so activity is deterministic.
function hash(str: string): number {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUS_LED: Record<RackItemStatus, string> = {
  online: "var(--green)",
  warning: "var(--amber)",
  offline: "var(--red)",
};
const STATUS_GLOW: Record<RackItemStatus, string> = {
  online: "rgba(50,215,75,.6)",
  warning: "rgba(255,159,10,.6)",
  offline: "rgba(255,69,58,.55)",
};

export function RackDevice({
  kind,
  label,
  subLabel,
  status,
  ports,
  disks,
  battery,
  load,
  accent,
  seed,
}: RackDeviceProps) {
  const rand = makeRng(hash(`${seed}|${kind}`));
  const offline = status === "offline";
  const devAccent = accent || KIND_ACCENT[kind] || "#8e8e93";

  const isPanel = kind === "patchPanel";
  const isBlank = kind === "blank" || kind === "label";
  const isEquip = kind === "general" || kind === "equipment";
  const isServer = kind === "server" || kind === "connection";
  const isStorage = kind === "storage";
  const isSwitch = kind === "switch";
  const isRouter = kind === "router";
  const isFirewall = kind === "firewall";
  const isPdu = kind === "pdu";
  const isUps = kind === "ups";
  const isKvm = kind === "kvm";

  const statusLed = STATUS_LED[status];
  const statusGlow = STATUS_GLOW[status];
  const powerColor = offline ? "#5a2422" : "var(--green)";
  const powerGlow = offline ? "transparent" : "rgba(50,215,75,.55)";
  const ledStatusClass = status === "warning" ? "led-warn" : offline ? "" : "led-ok";
  const ledPowerClass = offline ? "" : "led-ok";

  const portCap = isPanel ? 24 : isSwitch ? 24 : 8;
  const drawPorts = Math.min(ports || (isSwitch ? 12 : isRouter ? 5 : 0), portCap);
  const portList = Array.from({ length: drawPorts }, (_, i) => {
    const active = !offline && rand() > 0.34;
    return { active, color: active ? "var(--green)" : "var(--rkd-dim)", blk: active ? `blk-${(i % 5) + 1}` : "" };
  });

  const drawDisks = Math.min(disks || (isServer ? 4 : isStorage ? 8 : 0), 14);
  const diskList = Array.from({ length: drawDisks }, (_, i) => {
    const busy = !offline && rand() > 0.42;
    return {
      busy,
      color: busy ? "var(--green)" : offline ? "var(--rkd-line)" : "var(--rkd-hi)",
      blk: busy ? `blk-${(i % 5) + 1}` : "",
    };
  });

  const panelPorts = isPanel ? Array.from({ length: Math.min(ports || 24, 24) }, (_, i) => i) : [];
  const outlets = isPdu ? [0, 1, 2, 3, 4, 5] : [];
  const fwBars = isFirewall ? [0, 1, 2, 3, 4, 5].map((i) => `fwb-${(i % 3) + 1}`) : [];

  const batteryPct = Math.max(0, Math.min(100, battery ?? (offline ? 0 : 88)));
  const cells = isUps
    ? [0, 1, 2, 3, 4].map((i) => {
        const on = batteryPct > i * 20 + 4;
        const col = batteryPct < 30 ? "var(--amber)" : "var(--green)";
        return on ? col : "var(--rkd-cell-off)";
      })
    : [];
  const onBattery = status === "warning" || offline;
  const upsMode = onBattery ? "Battery" : "Online";
  const upsModeColor = onBattery ? "var(--amber)" : "var(--green)";
  const loadPct = Math.max(2, Math.min(100, load ?? 62));

  const channels = isKvm
    ? [1, 2, 3, 4].map((n) => {
        const sel = n === 1;
        return {
          n,
          bg: sel ? "color-mix(in srgb,#64d2ff 22%,transparent)" : "var(--rkd-well)",
          fg: sel ? "#64d2ff" : "var(--text-faint)",
          border: sel ? "#64d2ff" : "var(--rkd-line)",
        };
      })
    : [];

  const hasName = !!label && !isBlank;
  const showLeds = !isBlank && !isPanel;
  const showMeta = !isBlank;

  return (
    <div className="rkd" style={{ ["--rkd-accent" as string]: devAccent }}>
      {/* left rack ear */}
      <div className="rkd-ear">
        <span className="rkd-ear-bolt" />
        <span className="rkd-ear-bolt" />
      </div>

      <div className="rkd-body">
        {showLeds ? (
          <div className="rkd-leds">
            <span
              className={ledPowerClass}
              title="power"
              style={{ background: powerColor, boxShadow: `0 0 6px ${powerGlow}` }}
            />
            <span
              className={ledStatusClass}
              title="status"
              style={{ background: statusLed, boxShadow: `0 0 6px ${statusGlow}` }}
            />
          </div>
        ) : null}

        {hasName ? (
          <div className="rkd-id">
            <span className="rkd-name">{label}</span>
            {subLabel ? <span className="rkd-sub">{subLabel}</span> : null}
          </div>
        ) : null}

        <div className="rkd-visual">
          {/* SWITCH */}
          {isSwitch ? (
            <div className="rkd-switch">
              <div className="rkd-ports">
                {portList.map((port, i) => (
                  <span className="rkd-port" key={i}>
                    <span className={`rkd-port-led ${port.blk}`} style={{ background: port.color }} />
                  </span>
                ))}
              </div>
              <div className="shimmer rkd-shimmer" />
            </div>
          ) : null}

          {/* ROUTER */}
          {isRouter ? (
            <div className="rkd-router">
              <span className="rkd-wan-label">WAN</span>
              <span className="rkd-port wan">
                <span className="rkd-port-led blk-3" style={{ background: "var(--rkd-accent)" }} />
              </span>
              <div className="rkd-divider" />
              <div className="rkd-ports">
                {portList.map((port, i) => (
                  <span className="rkd-port" key={i}>
                    <span className={`rkd-port-led ${port.blk}`} style={{ background: port.color }} />
                  </span>
                ))}
              </div>
              <div className="shimmer rkd-shimmer" />
            </div>
          ) : null}

          {/* FIREWALL */}
          {isFirewall ? (
            <div className="rkd-firewall">
              <svg width="18" height="20" viewBox="0 0 24 26" fill="none">
                <path
                  d="M12 1.5 21 5v7c0 6.2-4.2 10.4-9 12.5C7.2 22.4 3 18.2 3 12V5l9-3.5Z"
                  fill="color-mix(in srgb,var(--rkd-accent) 18%,transparent)"
                  stroke="var(--rkd-accent)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 12.5 11 15l4.5-5"
                  stroke="var(--rkd-accent)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="rkd-fwbars">
                {fwBars.map((cls, i) => (
                  <span className={`rkd-fwbar ${cls}`} key={i} />
                ))}
              </div>
              <span className="rkd-fw-label">Secure</span>
            </div>
          ) : null}

          {/* SERVER / CONNECTION */}
          {isServer ? (
            <div className="rkd-server">
              <div className="rkd-disks-row">
                {diskList.map((disk, i) => (
                  <span className="rkd-disk-bay" key={i}>
                    <span className={`rkd-disk-led ${disk.blk}`} style={{ background: disk.color }} />
                  </span>
                ))}
              </div>
              <div className="rkd-vent" />
              <div className="rkd-fans">
                <span className="fan rkd-fan" />
                <span className="fan rkd-fan alt" />
              </div>
            </div>
          ) : null}

          {/* STORAGE */}
          {isStorage ? (
            <div className="rkd-storage">
              {diskList.map((disk, i) => (
                <span className="rkd-storage-bay" key={i}>
                  <span className={`rkd-disk-led ${disk.blk}`} style={{ background: disk.color }} />
                  <span className="rkd-storage-bar" />
                </span>
              ))}
            </div>
          ) : null}

          {/* PDU */}
          {isPdu ? (
            <div className="rkd-pdu">
              <div className="rkd-outlets">
                {outlets.map((o) => (
                  <span className="rkd-outlet" key={o}>
                    <span className="rkd-outlet-pin" />
                    <span className="rkd-outlet-pin" />
                  </span>
                ))}
              </div>
              <div className="rkd-load">
                <div className="rkd-load-track">
                  <div className="rkd-load-fill" style={{ width: `${loadPct}%` }} />
                </div>
                <span className="rkd-load-pct">{loadPct}%</span>
              </div>
            </div>
          ) : null}

          {/* UPS */}
          {isUps ? (
            <div className="rkd-ups">
              <span className="charge rkd-bolt">⚡</span>
              <div className="rkd-cells">
                {cells.map((color, i) => (
                  <span className="rkd-cell" key={i} style={{ background: color }} />
                ))}
                <span className="rkd-cell-cap" />
              </div>
              <span className="rkd-ups-pct">{batteryPct}%</span>
              <span className="rkd-ups-mode" style={{ color: upsModeColor }}>
                {upsMode}
              </span>
            </div>
          ) : null}

          {/* KVM */}
          {isKvm ? (
            <div className="rkd-kvm">
              <div className="rkd-kvm-screens">
                <span className="rkd-kvm-screen">
                  <span className="rkd-kvm-screen-in" />
                </span>
                <span className="rkd-kvm-screen">
                  <span className="rkd-kvm-screen-in" />
                </span>
              </div>
              <div className="rkd-kvm-channels">
                {channels.map((ch) => (
                  <span
                    className="rkd-kvm-ch"
                    key={ch.n}
                    style={{ background: ch.bg, color: ch.fg, borderColor: ch.border }}
                  >
                    {ch.n}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* PATCH PANEL */}
          {isPanel ? (
            <div className="rkd-panel">
              {panelPorts.map((p) => (
                <span className="rkd-panel-port" key={p} />
              ))}
            </div>
          ) : null}

          {/* EQUIPMENT / GENERAL */}
          {isEquip ? (
            <div className="rkd-equip">
              <div className="rkd-vent flex" />
              <span className="rkd-equip-label">{kind === "equipment" ? "Equipment" : "Device"}</span>
            </div>
          ) : null}

          {/* BLANK / LABEL */}
          {isBlank ? (
            <div className="rkd-blank">
              <div className="rkd-blank-plate" />
            </div>
          ) : null}
        </div>

        {showMeta ? (
          <div className="rkd-meta">
            <span className="rkd-status-dot" style={{ background: statusLed }} title={status} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
