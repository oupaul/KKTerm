import type { ReactNode } from "react";

export function SettingsSectionHeader({
  actions,
  label,
  title,
}: {
  actions?: ReactNode;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <div className="settings-section-header">
      <div className="settings-section-title">
        <h2>{label || title}</h2>
      </div>
      {actions ? <div className="settings-header-actions">{actions}</div> : null}
    </div>
  );
}

export function SettingsSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export type PlannedSetting = {
  label: string;
  value: string;
  hint?: string;
};

export function PlannedSettingsGrid({ settings }: { settings: readonly PlannedSetting[] }) {
  return (
    <div className="settings-summary-grid">
      {settings.map((setting) => (
        <div className="settings-summary-item planned-setting" key={setting.label}>
          <span>{setting.label}</span>
          <strong>{setting.value}</strong>
          {setting.hint ? <small>{setting.hint}</small> : null}
        </div>
      ))}
    </div>
  );
}
