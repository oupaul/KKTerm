import { FolderOpen, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  invokeCommand,
  isTauriRuntime,
  type AssistantSkillSummary,
} from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { SettingsCollapsibleFieldset } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

export function AssistantSkillsControl() {
  const { t } = useTranslation();
  const aiProviderSettings = useWorkspaceStore(
    (state) => state.aiProviderSettings,
  );
  const setAiProviderSettings = useWorkspaceStore(
    (state) => state.setAiProviderSettings,
  );
  const showStatusBarNotice = useWorkspaceStore(
    (state) => state.showStatusBarNotice,
  );
  const [skills, setSkills] = useState<AssistantSkillSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [customBusy, setCustomBusy] = useState(false);
  const customSkillsEnabled = aiProviderSettings.customSkillsEnabled ?? true;

  async function refresh() {
    if (!isTauriRuntime()) {
      setSkills([]);
      return;
    }
    try {
      const list = await invokeCommand("list_assistant_skills", undefined);
      setSkills(list);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleOpenSkillsFolder() {
    try {
      await invokeCommand("open_assistant_skills_folder", undefined);
    } catch (error) {
      showStatusBarNotice(
        error instanceof Error ? error.message : String(error),
        {
          tone: "error",
        },
      );
    }
  }

  async function handleOpenCustomSkillsFolder() {
    try {
      await invokeCommand("open_custom_assistant_skills_folder", undefined);
    } catch (error) {
      showStatusBarNotice(
        error instanceof Error ? error.message : String(error),
        {
          tone: "error",
        },
      );
    }
  }

  async function handleCustomSkillsEnabledChange(enabled: boolean) {
    setCustomBusy(true);
    try {
      const settings = await invokeCommand(
        "set_custom_assistant_skills_enabled",
        { enabled },
      );
      setAiProviderSettings(settings);
      await refresh();
    } catch (error) {
      showStatusBarNotice(
        error instanceof Error ? error.message : String(error),
        {
          tone: "error",
        },
      );
    } finally {
      setCustomBusy(false);
    }
  }

  async function handleOpenSkill(name: string) {
    try {
      await invokeCommand("open_assistant_skill", { name });
    } catch (error) {
      showStatusBarNotice(
        error instanceof Error ? error.message : String(error),
        {
          tone: "error",
        },
      );
    }
  }

  async function handleEnabledChange(
    skill: AssistantSkillSummary,
    enabled: boolean,
  ) {
    setBusyName(skill.name);
    try {
      const settings = await invokeCommand("set_assistant_skill_enabled", {
        name: skill.name,
        enabled,
      });
      setAiProviderSettings(settings);
      setSkills((current) =>
        current.map((item) =>
          item.name === skill.name ? { ...item, enabled } : item,
        ),
      );
    } catch (error) {
      showStatusBarNotice(
        error instanceof Error ? error.message : String(error),
        {
          tone: "error",
        },
      );
    } finally {
      setBusyName(null);
    }
  }

  return (
    <SettingsCollapsibleFieldset
      collapseLabel={t("common.collapse")}
      dataTutorialId="settings.assistantSkillsTitle"
      expandLabel={t("common.expand")}
      legend={t("settings.assistantSkillsTitle")}
    >
      <div>
        <p className="field-hint">{t("settings.assistantSkillsHint")}</p>
      </div>
      <div className="assistant-custom-skills-control">
        <div className="assistant-custom-skills-main">
          <div className="assistant-custom-skills-title">
            {t("settings.assistantCustomSkillsTitle")}
          </div>
          <p className="field-hint">
            {t("settings.assistantCustomSkillsHint")}
          </p>
        </div>
        <div className="assistant-custom-skills-actions">
          <label className="assistant-skill-toggle">
            <ToggleSwitch
              checked={customSkillsEnabled}
              disabled={customBusy}
              onChange={(enabled) =>
                void handleCustomSkillsEnabledChange(enabled)
              }
            />
            <span>
              {customSkillsEnabled
                ? t("settings.assistantSkillsEnabled")
                : t("settings.assistantSkillsDisabled")}
            </span>
          </label>
          <button
            className="toolbar-button"
            onClick={() => void handleOpenCustomSkillsFolder()}
            type="button"
          >
            <FolderOpen size={15} />
            {t("settings.assistantCustomSkillsOpenFolder")}
          </button>
        </div>
      </div>
      {loadError ? <div className="settings-error">{loadError}</div> : null}
      <div className="assistant-skills-list">
        {skills.length === 0 ? (
          <p className="field-hint">{t("settings.assistantSkillsEmpty")}</p>
        ) : (
          skills.map((skill) => (
            <AssistantSkillRow
              busy={busyName === skill.name}
              key={skill.folderPath}
              onEnabledChange={(enabled) =>
                void handleEnabledChange(skill, enabled)
              }
              onOpen={() => void handleOpenSkill(skill.name)}
              skill={skill}
            />
          ))
        )}
      </div>
      <div className="settings-actions">
        <button
          className="toolbar-button"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw size={15} />
          {t("common.refresh")}
        </button>
        <button
          className="toolbar-button"
          onClick={() => void handleOpenSkillsFolder()}
          type="button"
        >
          <FolderOpen size={15} />
          {t("settings.assistantSkillsOpenFolder")}
        </button>
      </div>
    </SettingsCollapsibleFieldset>
  );
}

function AssistantSkillRow({
  busy,
  onEnabledChange,
  onOpen,
  skill,
}: {
  busy: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onOpen: () => void;
  skill: AssistantSkillSummary;
}) {
  const { t } = useTranslation();
  const invalid = Boolean(skill.invalidReason);
  return (
    <div
      className="assistant-skill-row"
      data-invalid={invalid ? "true" : "false"}
    >
      <div className="assistant-skill-row-main">
        <div className="assistant-skill-row-name">{skill.name}</div>
        <div className="assistant-skill-row-description">
          {skill.invalidReason || skill.description}
        </div>
        <div className="assistant-skill-row-path">{skill.folderPath}</div>
      </div>
      <div className="assistant-skill-row-actions">
        <label className="assistant-skill-toggle">
          <ToggleSwitch
            checked={skill.enabled && !invalid}
            disabled={busy || invalid}
            onChange={onEnabledChange}
          />
          <span>
            {skill.enabled
              ? t("settings.assistantSkillsEnabled")
              : t("settings.assistantSkillsDisabled")}
          </span>
        </label>
        <button
          aria-label={t("settings.assistantSkillsOpen", { name: skill.name })}
          className="icon-button"
          onClick={onOpen}
          title={t("settings.assistantSkillsOpen", { name: skill.name })}
          type="button"
        >
          <FolderOpen size={14} />
        </button>
      </div>
    </div>
  );
}
