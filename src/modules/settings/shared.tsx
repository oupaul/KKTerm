import { ChevronDown, ChevronRight } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ariaExpanded } from "../../lib/aria";

export type SettingsSaveRegistration = {
  hasChanges: boolean;
  onSave?: () => void | Promise<void>;
};

const SettingsSaveContext =
  createContext<((registration: SettingsSaveRegistration) => void) | null>(null);

export function SettingsSaveProvider({
  children,
  onRegister,
  sectionId,
}: {
  children: ReactNode;
  onRegister: (sectionId: string, registration: SettingsSaveRegistration) => void;
  sectionId: string;
}) {
  const register = useCallback(
    (registration: SettingsSaveRegistration) => onRegister(sectionId, registration),
    [onRegister, sectionId],
  );

  return (
    <SettingsSaveContext.Provider value={register}>
      {children}
    </SettingsSaveContext.Provider>
  );
}

export function useSettingsSaveRegistration(registration: SettingsSaveRegistration) {
  const register = useContext(SettingsSaveContext);
  const onSaveRef = useRef(registration.onSave);

  useEffect(() => {
    onSaveRef.current = registration.onSave;
  }, [registration.onSave]);

  useEffect(() => {
    if (!register) {
      return;
    }
    register({
      hasChanges: registration.hasChanges,
      onSave: () => onSaveRef.current?.(),
    });
    return () => register({ hasChanges: false });
  }, [register, registration.hasChanges]);
}

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

export function SettingsCollapsibleFieldset({
  children,
  className = "settings-subsection settings-fieldset",
  collapseLabel,
  dataTutorialId,
  defaultCollapsed = true,
  expandLabel,
  legend,
}: {
  children: ReactNode;
  className?: string;
  collapseLabel: string;
  dataTutorialId?: string;
  defaultCollapsed?: boolean;
  expandLabel: string;
  legend: string;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const contentId = useId();
  const toggleLabel = expanded ? collapseLabel : expandLabel;

  return (
    <fieldset
      className={`${className} settings-collapsible-fieldset`}
      data-tutorial-id={dataTutorialId}
    >
      <legend>
        <button
          aria-controls={contentId}
          aria-label={`${toggleLabel} ${legend}`}
          className="settings-collapsible-legend-button"
          onClick={() => setExpanded((current) => !current)}
          type="button"
          {...ariaExpanded(expanded)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{legend}</span>
        </button>
      </legend>
      <div className="settings-collapsible-content" hidden={!expanded} id={contentId}>
        {children}
      </div>
    </fieldset>
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
