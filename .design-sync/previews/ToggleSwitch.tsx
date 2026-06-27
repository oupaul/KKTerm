import { ToggleSwitch } from "kkterm";

const noop = () => {};

export const On = () => <ToggleSwitch checked onChange={noop} />;

export const Off = () => <ToggleSwitch checked={false} onChange={noop} />;

export const Disabled = () => <ToggleSwitch checked disabled onChange={noop} />;

export const SettingsRow = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      width: 320,
      padding: "11px 14px",
      background: "var(--surface)",
      border: "1px solid var(--hairline)",
      borderRadius: 10,
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontWeight: 600, color: "var(--text)" }}>Confirm before closing</span>
      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        Warn when a tab still has a running process
      </span>
    </div>
    <ToggleSwitch checked onChange={noop} />
  </div>
);
