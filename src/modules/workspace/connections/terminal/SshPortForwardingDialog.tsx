import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DIcon, Field, Sheet, Switch, TextInput } from "../../../../app/ui/dialog";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import type { Connection, SshPortForwardMode, SshPortForwarding } from "../../../../types";
import { useWorkspaceStore } from "../../../../store";
import { connectionPasswordOwnerId, resolveSshSocksProxyRequest } from "../utils";

type ForwardingDraft = Record<SshPortForwardMode, {
  bind: string;
  listenPort: string;
  destHost: string;
  destPort: string;
}>;

const MODES: Array<{
  key: SshPortForwardMode;
  icon: "arrowdown" | "arrowup" | "network";
  nameKey: string;
  taglineKey: string;
  flag: string;
}> = [
  { key: "L", icon: "arrowdown", nameKey: "terminal.sshForwardModeLocal", taglineKey: "terminal.sshForwardModeLocalTagline", flag: "-L" },
  { key: "R", icon: "arrowup", nameKey: "terminal.sshForwardModeRemote", taglineKey: "terminal.sshForwardModeRemoteTagline", flag: "-R" },
  { key: "D", icon: "network", nameKey: "terminal.sshForwardModeDynamic", taglineKey: "terminal.sshForwardModeDynamicTagline", flag: "-D" },
];

const DEFAULT_DRAFT: ForwardingDraft = {
  L: { bind: "127.0.0.1", listenPort: "8080", destHost: "localhost", destPort: "3000" },
  R: { bind: "127.0.0.1", listenPort: "9000", destHost: "localhost", destPort: "3000" },
  D: { bind: "127.0.0.1", listenPort: "1080", destHost: "", destPort: "" },
};

const COMMON_PORT_NAMES: Record<number, string> = {
  20: "FTP data",
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  67: "DHCP server",
  68: "DHCP client",
  80: "HTTP",
  110: "POP3",
  123: "NTP",
  143: "IMAP",
  161: "SNMP",
  389: "LDAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  587: "SMTP submission",
  636: "LDAPS",
  993: "IMAPS",
  995: "POP3S",
  1080: "SOCKS",
  1433: "Microsoft SQL Server",
  1521: "Oracle Database",
  2049: "NFS",
  2375: "Docker",
  2376: "Docker TLS",
  3000: "Development HTTP",
  3306: "MySQL",
  3389: "RDP",
  5432: "PostgreSQL",
  5900: "VNC",
  6379: "Redis",
  8000: "HTTP alternate",
  8080: "HTTP alternate",
  8443: "HTTPS alternate",
  9000: "Application server",
};

function numeric(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

function uniqueOptions(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function isLoopbackHost(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function formatPortOption(value: string) {
  const protocol = COMMON_PORT_NAMES[Number(value)];
  return protocol ? `${value} (${protocol})` : value;
}

function EditableDropdownInput({
  value,
  options,
  onChange,
  ariaLabel,
  inputMode,
  optionLabel,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  inputMode?: "text" | "numeric";
  optionLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    function positionMenu() {
      const anchor = rootRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const anchorBounds = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 5;
      const width = Math.min(
        Math.max(anchorBounds.width, 300),
        window.innerWidth - viewportPadding * 2,
      );
      const maxLeft = window.innerWidth - width - viewportPadding;
      const left = Math.max(viewportPadding, Math.min(anchorBounds.right - width, maxLeft));
      const top = anchorBounds.bottom + gap;
      const maxHeight = Math.max(40, Math.min(240, window.innerHeight - top - viewportPadding));

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${maxHeight}px`;
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open, options.length]);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
    rootRef.current?.querySelector("input")?.focus();
  }

  return (
    <div className="sshf-editable-dropdown" ref={rootRef}>
      <TextInput
        aria-label={ariaLabel}
        inputMode={inputMode}
        mono
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        value={value}
      />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="sshf-editable-dropdown-toggle"
        onClick={() => setOpen((current) => !current)}
        title={ariaLabel}
        type="button"
      >
        <DIcon name="updown" size={12} />
      </button>
      {open ? createPortal(
        <div className="sshf-editable-dropdown-menu" ref={menuRef} role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option === value}
              className={option === value ? "selected" : ""}
              key={option}
              onClick={() => selectOption(option)}
              role="option"
              type="button"
            >
              {optionLabel?.(option) ?? option}
            </button>
          ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function shortAddress(value: string) {
  return value === "localhost" ? "localhost" : value || "127.0.0.1";
}

function forwardingCommand(connection: Connection, mode: SshPortForwardMode, draft: ForwardingDraft[SshPortForwardMode]) {
  const modeInfo = MODES.find((entry) => entry.key === mode) ?? MODES[0];
  const spec = mode === "D"
    ? `${draft.bind}:${draft.listenPort}`
    : `${draft.bind}:${draft.listenPort}:${draft.destHost}:${draft.destPort}`;
  return `ssh ${modeInfo.flag} ${spec} ${connection.user}@${connection.host}`;
}

function modeLabel(mode: SshPortForwardMode, t: (key: string) => string) {
  const info = MODES.find((entry) => entry.key === mode);
  return info ? t(info.nameKey) : mode;
}

function forwardingEndpoint(forwarding: SshPortForwarding) {
  if (forwarding.mode === "D") {
    return "SOCKS5";
  }
  return `${shortAddress(forwarding.destHost ?? "")}:${forwarding.destPort ?? ""}`;
}

function sshConnectionRequest(connection: Connection) {
  const sshSettings = useWorkspaceStore.getState().sshSettings;
  return {
    host: connection.host,
    user: connection.user,
    port: connection.port,
    keyPath: connection.keyPath,
    proxyJump: connection.proxyJump,
    ...resolveSshSocksProxyRequest(connection, sshSettings),
    authMethod: connection.authMethod,
    secretOwnerId: connectionPasswordOwnerId(connection),
  };
}

export function hasEnabledSshPortForwardings(connection: Connection | undefined) {
  return Boolean(connection?.sshPortForwardings?.some((forwarding) => forwarding.enabled));
}

export function SshPortForwardingDialog({
  connection,
  onClose,
  onConnectionUpdated,
}: {
  connection: Connection;
  onClose: () => void;
  onConnectionUpdated: (connection: Connection) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SshPortForwardMode>("L");
  const [drafts, setDrafts] = useState<ForwardingDraft>(DEFAULT_DRAFT);
  const [forwardings, setForwardings] = useState<SshPortForwarding[]>(connection.sshPortForwardings ?? []);
  const [localInterfaceAddresses, setLocalInterfaceAddresses] = useState<string[]>([]);
  const [remoteLoopbackPorts, setRemoteLoopbackPorts] = useState<number[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let cancelled = false;
    void invokeCommand("network_interfaces", undefined)
      .then((interfaces) => {
        if (cancelled) return;
        setLocalInterfaceAddresses(uniqueOptions(
          interfaces
            .flatMap((networkInterface) => networkInterface.addresses.map((address) => address.ip)),
        ));
      })
      .catch(() => undefined);
    void invokeCommand("list_remote_loopback_ports", {
      request: sshConnectionRequest(connection),
    })
      .then((ports) => {
        if (!cancelled) {
          setRemoteLoopbackPorts([...new Set(ports.map((entry) => entry.port))]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connection]);

  const counts = useMemo(() => {
    return forwardings.reduce<Record<SshPortForwardMode, number>>(
      (acc, forwarding) => {
        if (forwarding.enabled) acc[forwarding.mode] += 1;
        return acc;
      },
      { L: 0, R: 0, D: 0 },
    );
  }, [forwardings]);
  const current = drafts[mode];
  const visibleForwardings = forwardings.filter((forwarding) => forwarding.mode === mode);
  const command = forwardingCommand(connection, mode, current);
  const bindAddressOptions = uniqueOptions(["127.0.0.1", "0.0.0.0", ...localInterfaceAddresses]);
  const listenPortOptions = uniqueOptions([
    DEFAULT_DRAFT[mode].listenPort,
    ...forwardings.filter((forwarding) => forwarding.mode === mode).map((forwarding) => String(forwarding.listenPort)),
  ]);
  const destinationHostOptions = uniqueOptions([
    "localhost",
    "127.0.0.1",
    ...(mode === "R" ? localInterfaceAddresses : []),
    ...forwardings.filter((forwarding) => forwarding.mode === mode).map((forwarding) => forwarding.destHost),
  ]);
  const destinationPortOptions = uniqueOptions([
    DEFAULT_DRAFT[mode].destPort,
    ...(mode === "L" && isLoopbackHost(current.destHost) ? remoteLoopbackPorts.map(String) : []),
    ...forwardings.filter((forwarding) => forwarding.mode === mode).map((forwarding) => forwarding.destPort ? String(forwarding.destPort) : undefined),
  ]);

  function updateDraft(patch: Partial<ForwardingDraft[SshPortForwardMode]>) {
    setDrafts((value) => ({ ...value, [mode]: { ...value[mode], ...patch } }));
  }

  async function persist(nextForwardings: SshPortForwarding[]) {
    setForwardings(nextForwardings);
    if (!isTauriRuntime()) {
      return;
    }
    const updated = await invokeCommand("update_connection_ssh_port_forwardings", {
      connectionId: connection.id,
      forwardings: nextForwardings.length > 0 ? nextForwardings : null,
    });
    if (updated) {
      onConnectionUpdated(updated);
    }
  }

  async function startForward(forwarding: SshPortForwarding) {
    if (!isTauriRuntime() || !forwarding.enabled) {
      return;
    }
    setBusyId(forwarding.id);
    setError("");
    try {
      await invokeCommand("start_ssh_port_forward", {
        request: {
          ...sshConnectionRequest(connection),
          forwardId: forwarding.id,
          mode: forwarding.mode,
          bind: forwarding.bind,
          listenPort: forwarding.listenPort,
          destHost: forwarding.destHost,
          destPort: forwarding.destPort,
          remotePort: forwarding.destPort,
        },
      });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd() {
    const listenPort = Number(current.listenPort);
    const destPort = Number(current.destPort);
    if (!listenPort || (mode !== "D" && (!current.destHost.trim() || !destPort))) {
      setError(t("terminal.sshPortForwardInvalid"));
      return;
    }
    const forwarding: SshPortForwarding = {
      id: `ssh-forward-${connection.id}-${mode}-${Date.now().toString(36)}`,
      mode,
      enabled: true,
      bind: current.bind.trim() || "127.0.0.1",
      listenPort,
      destHost: mode === "D" ? undefined : current.destHost.trim(),
      destPort: mode === "D" ? undefined : destPort,
    };
    const next = [...forwardings, forwarding];
    await persist(next);
    await startForward(forwarding);
  }

  async function handleRemove(id: string) {
    const forwarding = forwardings.find((entry) => entry.id === id);
    const next = forwardings.filter((entry) => entry.id !== id);
    await persist(next);
    if (forwarding?.enabled && isTauriRuntime()) {
      await invokeCommand("close_ssh_port_forward", { request: { forwardId: id } }).catch(() => undefined);
    }
  }

  async function handleToggleForwarding(forwarding: SshPortForwarding, nextEnabled: boolean) {
    const updatedForwarding = { ...forwarding, enabled: nextEnabled };
    const next = forwardings.map((entry) => entry.id === forwarding.id ? updatedForwarding : entry);
    setError("");
    try {
      await persist(next);
      if (nextEnabled) {
        await startForward(updatedForwarding);
      } else if (isTauriRuntime()) {
        setBusyId(forwarding.id);
        try {
          await invokeCommand("close_ssh_port_forward", { request: { forwardId: forwarding.id } });
        } finally {
          setBusyId(null);
        }
      }
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : String(toggleError));
    }
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop sshf-backdrop" role="presentation">
      <Sheet
        className="sshf"
        eyebrow={t("terminal.sshPortForwardingTitle")}
        footer={
          <Actions
            primary={<Btn kind="primary" icon="plus" onClick={() => void handleAdd()}>{t("terminal.addForward")}</Btn>}
            cancel={<Btn onClick={onClose}>{t("common.close")}</Btn>}
          />
        }
        width={760}
      >
        <div className="sshf-body">
          <div className="sshf-modes">
            {MODES.map((entry) => (
              <button className={`sshf-mode${mode === entry.key ? " active" : ""}`} key={entry.key} onClick={() => setMode(entry.key)} type="button">
                <div className="m-top">
                  <span className="m-flag"><DIcon name={entry.icon} size={15} /></span>
                  <span className="m-name">{t(entry.nameKey)}</span>
                  {counts[entry.key] > 0 ? <span className="m-badge">{counts[entry.key]}</span> : null}
                </div>
                <span className="m-desc">{t(entry.taglineKey)}</span>
              </button>
            ))}
          </div>

          <div className="sshf-diagram">
            <div className="sshf-stage">
              <ForwardNode icon="monitor" label={t("terminal.thisPc")} endpoint={`${current.bind}:${current.listenPort}`} listen={mode !== "R"} listeningLabel={t("terminal.sshForwardListening")} />
              <div className={`sshf-track ${mode === "R" ? "rtl" : "ltr"}`}><span className="sshf-rail" /><span className="sshf-dot" /><span className="sshf-dot two" /><span className="sshf-dot three" /></div>
              <ForwardNode icon="server" label={connection.name} endpoint={mode === "D" ? t("terminal.sshTunnel") : `${current.destHost}:${current.destPort}`} listen={mode === "R"} listeningLabel={t("terminal.sshForwardListening")} />
              {mode === "D" ? (
                <>
                  <div className="sshf-track ltr"><span className="sshf-rail" /><span className="sshf-dot" /><span className="sshf-dot two" /></div>
                  <ForwardNode icon="globe" label={t("terminal.internet")} endpoint={t("terminal.anyHost")} />
                </>
              ) : null}
            </div>
          </div>

          <div className="sshf-active">
            <div className="sa-head">{t("terminal.runningForwards")} <span className="sa-count">{visibleForwardings.length}</span></div>
            {visibleForwardings.length === 0 ? (
              <div className="sa-empty">{t("terminal.noSshForwards", { mode: modeLabel(mode, t).toLowerCase() })}</div>
            ) : (
              <div className="sa-list">
                {visibleForwardings.map((forwarding) => (
                  <div className="sa-row" key={forwarding.id}>
                    <span className={`sa-dot ${forwarding.enabled ? "active" : ""}`} />
                    <span className="sa-local">{forwarding.bind}:{forwarding.listenPort}</span>
                    <span className="sa-arr">-&gt;</span>
                    <span className="sa-remote">{forwardingEndpoint(forwarding)}</span>
                    <span className="sa-time">{busyId === forwarding.id ? t("terminal.opening") : forwarding.enabled ? t("terminal.active") : t("terminal.disabled")}</span>
                    <Switch
                      ariaLabel={t("terminal.enableForwarding")}
                      disabled={busyId === forwarding.id}
                      on={forwarding.enabled}
                      onChange={(nextEnabled) => void handleToggleForwarding(forwarding, nextEnabled)}
                    />
                    <button className="sa-del danger" onClick={() => void handleRemove(forwarding.id)} title={t("common.delete")} type="button">
                      <DIcon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`sshf-pairs${mode === "D" ? " one" : ""}`}>
            <div className="sshf-pair">
              <div className="pair-h"><span className="pdot listen" />{mode === "R" ? t("terminal.forwardTo") : t("terminal.localListener")}<small>{t("terminal.onThisPc")}</small></div>
              <div className="sshf-row3">
                <Field label={t("terminal.bindAddress")}><EditableDropdownInput ariaLabel={t("terminal.bindAddress")} options={bindAddressOptions} value={current.bind} onChange={(value) => updateDraft({ bind: value })} /></Field>
                <Field label={mode === "D" ? t("terminal.socksPort") : t("terminal.listenPort")}><EditableDropdownInput ariaLabel={mode === "D" ? t("terminal.socksPort") : t("terminal.listenPort")} inputMode="numeric" optionLabel={formatPortOption} options={listenPortOptions} value={current.listenPort} onChange={(value) => updateDraft({ listenPort: numeric(value) })} /></Field>
              </div>
            </div>
            {mode !== "D" ? (
              <div className="sshf-pair">
                <div className="pair-h"><span className="pdot dest" />{mode === "R" ? t("terminal.remoteListener") : t("terminal.destination")}<small>{mode === "R" ? t("terminal.onServer") : t("terminal.reachableFromServer")}</small></div>
                <div className="sshf-row3">
                  <Field label={t("terminal.host")}><EditableDropdownInput ariaLabel={t("terminal.host")} options={destinationHostOptions} value={current.destHost} onChange={(value) => updateDraft({ destHost: value })} /></Field>
                  <Field label={t("terminal.port")}><EditableDropdownInput ariaLabel={t("terminal.port")} inputMode="numeric" optionLabel={formatPortOption} options={destinationPortOptions} value={current.destPort} onChange={(value) => updateDraft({ destPort: numeric(value) })} /></Field>
                </div>
              </div>
            ) : null}
          </div>

          <div className="sshf-cmd">
            <span className="cmd-prompt">$</span>
            <code>{command}</code>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </Sheet>
    </div>
  );
}

function ForwardNode({
  icon,
  label,
  endpoint,
  listen,
  listeningLabel,
}: {
  icon: "monitor" | "server" | "globe";
  label: string;
  endpoint: string;
  listen?: boolean;
  listeningLabel?: string;
}) {
  return (
    <div className="sshf-node">
      <div className={`sshf-tile ${icon === "monitor" ? "pc" : icon}${listen ? " listen" : ""}`}>
        {listen ? <span className="sshf-listen-chip"><i />{listeningLabel}</span> : null}
        <DIcon name={icon} size={26} />
      </div>
      <div className="sshf-cap">
        <span className="role">{label}</span>
        <span className="ep">{endpoint}</span>
      </div>
    </div>
  );
}
