import * as Icons from "lucide-react";
import type { ComponentType, CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../../../app/ConfirmDialog";
import { invokeCommand, isTauriRuntime } from "../../../../lib/tauri";
import { ToggleSwitch } from "../../../settings/ToggleSwitch";
import { useWorkspaceStore } from "../../../../store";
import type { Connection, QuickCommand, WorkspaceTab } from "../../../../types";
import { ACCENT_PALETTE, isAccentName, resolveAccent } from "../../../dashboard/registry/palette";
import { ICON_NAMES, type IconName } from "../../../dashboard/types";
import { getPaneRenderer, writeInputToPane } from "../../paneRegistry";
import { QUICK_COMMAND_LIBRARY, type QuickCommandLibraryEntry } from "./quickCommandLibrary";

type QuickCommandDraft = Omit<QuickCommand, "id">;

const DEFAULT_DRAFT: QuickCommandDraft = {
  label: "",
  command: "",
  iconName: "Terminal",
  accentName: "default",
  sendEnter: true,
  confirm: false,
};
const EMPTY_QUICK_COMMANDS: QuickCommand[] = [];

function quickCommandId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `quick-${crypto.randomUUID()}`
    : `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function payloadFor(command: QuickCommand) {
  const text = command.command.replace(/\r\n/g, "\n");
  if (!command.sendEnter) {
    return text;
  }
  if (!text.includes("\n")) {
    return `${text}\r`;
  }
  return text
    .split("\n")
    .map((line) => `${line}\r`)
    .join("");
}

function iconFor(name: string) {
  const iconMap = Icons as unknown as Record<string, ComponentType<{ size?: number }>>;
  return iconMap[name] ?? Icons.Terminal;
}

function commandFromLibrary(entry: QuickCommandLibraryEntry, translate: (key: string) => string): QuickCommand {
  return {
    id: quickCommandId(),
    label: translate(entry.labelKey),
    command: entry.command,
    iconName: entry.iconName,
    accentName: entry.accentName,
    sendEnter: entry.sendEnter,
    confirm: entry.confirm,
  };
}

function accentFor(name: string) {
  return resolveAccent(isAccentName(name) ? name : "default");
}

function connectionAiContext(connection: Connection | undefined) {
  if (!connection) {
    return "Connection: unknown";
  }
  return [
    `Connection name: ${connection.name}`,
    `Connection type: ${connection.type}`,
    connection.host ? `Host: ${connection.host}` : undefined,
    connection.user ? `User: ${connection.user}` : undefined,
    connection.port ? `Port: ${connection.port}` : undefined,
    connection.localShell ? `Local shell: ${connection.localShell}` : undefined,
    connection.localStartupDirectory ? `Startup directory: ${connection.localStartupDirectory}` : undefined,
    connection.url ? `URL: ${connection.url}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function sanitizeGeneratedCommand(value: string) {
  return value
    .trim()
    .replace(/^```(?:[A-Za-z0-9_-]+)?\s*/i, "")
    .replace(/```$/i, "")
    .trim()
    .replace(/^\$\s+/, "")
    .trim();
}

export function QuickCommandBar({ tab }: { tab: WorkspaceTab }) {
  const { t } = useTranslation();
  const connectionId = tab.connection?.id;
  const quickCommands = useWorkspaceStore((state) =>
    connectionId ? state.quickCommandsByConnection[connectionId] ?? EMPTY_QUICK_COMMANDS : EMPTY_QUICK_COMMANDS,
  );
  const ensureQuickCommandsLoaded = useWorkspaceStore((state) => state.ensureQuickCommandsLoaded);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<QuickCommand | null>(null);

  useEffect(() => {
    ensureQuickCommandsLoaded(connectionId);
  }, [connectionId, ensureQuickCommandsLoaded]);

  function send(command: QuickCommand) {
    const paneId =
      tab.focusedPaneId ??
      tab.panes.find((pane) => pane.kind === undefined || pane.kind === "terminal")?.id;
    if (!paneId || !writeInputToPane(paneId, payloadFor(command))) {
      showStatusBarNotice(t("terminal.quickCommandsNoPane"), { tone: "warning" });
      return;
    }
    getPaneRenderer(paneId)?.focus();
  }

  function run(command: QuickCommand) {
    if (command.confirm) {
      setPendingCommand(command);
      return;
    }
    send(command);
  }

  return (
    <>
      <div className="quick-command-bar" aria-label={t("terminal.quickCommandsBar")}>
        {quickCommands.length === 0 ? (
          <button className="quick-command-empty" onClick={() => setDialogOpen(true)} type="button">
            <Icons.Plus size={13} />
            {t("terminal.quickCommandsAddFirst")}
          </button>
        ) : (
          quickCommands.map((command) => {
            const Icon = iconFor(command.iconName);
            const accent = accentFor(command.accentName);
            return (
              <button
                className="quick-command-button"
                key={command.id}
                onClick={() => run(command)}
                style={{ "--quick-command-accent": accent.color } as CSSProperties}
                title={command.command}
                type="button"
              >
                <Icon size={13} />
                <span>{command.label}</span>
              </button>
            );
          })
        )}
        <button
          className="quick-command-manage"
          onClick={() => setDialogOpen(true)}
          title={t("terminal.quickCommandsManage")}
          type="button"
        >
          <Icons.Settings size={13} />
        </button>
      </div>
      {dialogOpen ? (
        <QuickCommandManagerDialog connection={tab.connection} connectionId={connectionId} onClose={() => setDialogOpen(false)} />
      ) : null}
      {pendingCommand ? (
        <ConfirmDialog
          confirmLabel={t("terminal.quickCommandsRun")}
          message={t("terminal.quickCommandsConfirm", { label: pendingCommand.label })}
          onCancel={() => setPendingCommand(null)}
          onConfirm={() => {
            send(pendingCommand);
            setPendingCommand(null);
          }}
          title={t("terminal.quickCommandsConfirmTitle")}
        />
      ) : null}
    </>
  );
}

function QuickCommandManagerDialog({
  connection,
  connectionId,
  onClose,
}: {
  connection: Connection | undefined;
  connectionId: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const quickCommands = useWorkspaceStore((state) =>
    connectionId ? state.quickCommandsByConnection[connectionId] ?? EMPTY_QUICK_COMMANDS : EMPTY_QUICK_COMMANDS,
  );
  const moveQuickCommand = useWorkspaceStore((state) => state.moveQuickCommand);
  const reorderQuickCommand = useWorkspaceStore((state) => state.reorderQuickCommand);
  const removeQuickCommand = useWorkspaceStore((state) => state.removeQuickCommand);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<QuickCommand | null>(null);
  const [draggingCommandId, setDraggingCommandId] = useState<string | null>(null);
  const [dragOverCommandId, setDragOverCommandId] = useState<string | null>(null);
  const dragOverCommandIdRef = useRef<string | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dragOverCommandIdRef.current = dragOverCommandId;
  }, [dragOverCommandId]);

  useEffect(() => {
    if (!addMenuOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && addMenuRef.current?.contains(target)) {
        return;
      }
      setAddMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [addMenuOpen]);

  useEffect(() => {
    if (!draggingCommandId) {
      return;
    }
    const activeDraggingCommandId = draggingCommandId;

    function onPointerMove(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const row = target instanceof Element ? target.closest<HTMLElement>(".quick-command-list-row") : null;
      const targetCommandId = row?.dataset.commandId ?? null;
      if (targetCommandId && targetCommandId !== activeDraggingCommandId) {
        setDragOverCommandId(targetCommandId);
      } else {
        setDragOverCommandId(null);
      }
    }

    function onPointerUp() {
      const targetCommandId = dragOverCommandIdRef.current;
      if (targetCommandId && targetCommandId !== activeDraggingCommandId) {
        reorderQuickCommand(connectionId, activeDraggingCommandId, targetCommandId);
      }
      setDraggingCommandId(null);
      setDragOverCommandId(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [connectionId, draggingCommandId, reorderQuickCommand]);

  function openCustomDialog(command: QuickCommand | null = null) {
    setEditingCommand(command);
    setCustomDialogOpen(true);
    setPresetDialogOpen(false);
    setAddMenuOpen(false);
  }

  function openPresetDialog() {
    setPresetDialogOpen(true);
    setCustomDialogOpen(false);
    setAddMenuOpen(false);
  }

  function startReorderDrag(event: ReactPointerEvent, commandId: string) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingCommandId(commandId);
    setDragOverCommandId(null);
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop quick-command-dialog-backdrop" role="presentation">
      <div className="connection-dialog quick-command-dialog quick-command-manager-dialog" role="dialog" aria-modal="true" aria-label={t("terminal.quickCommandsManage")}>
        <header className="connection-dialog-header compact">
          <div>
            <h2>{t("terminal.quickCommandsManage")}</h2>
          </div>
          <button className="connection-dialog-close" onClick={onClose} type="button" aria-label={t("common.close")}>
            <Icons.X size={16} />
          </button>
        </header>

        <section className="quick-command-manager-body">
          <div className="quick-command-list-header">
            <div className="quick-command-add-wrapper" ref={addMenuRef}>
              <button className="toolbar-button" onClick={() => setAddMenuOpen((open) => !open)} type="button" {...menuExpanded(addMenuOpen)}>
                <Icons.Plus size={13} />
                {t("common.add")}
              </button>
              {addMenuOpen ? (
                <div className="quick-command-add-menu" role="menu" aria-label={t("terminal.quickCommandsAddMenu")}>
                  <button onClick={() => openCustomDialog()} role="menuitem" type="button">
                    <Icons.Pencil size={14} />
                    {t("terminal.quickCommandsCustomCommand")}
                  </button>
                  <button onClick={openPresetDialog} role="menuitem" type="button">
                    <Icons.Library size={14} />
                    {t("terminal.quickCommandsLibrary")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {quickCommands.length === 0 ? (
            <p className="quick-command-muted">{t("terminal.quickCommandsEmpty")}</p>
          ) : (
            <div className="quick-command-list-rows">
              {quickCommands.map((command, index) => {
                const Icon = iconFor(command.iconName);
                return (
                  <div
                    className={[
                      "quick-command-list-row",
                      dragOverCommandId === command.id ? "drag-over" : "",
                      draggingCommandId === command.id ? "dragging" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-command-id={command.id}
                    key={command.id}
                  >
                    <span className="quick-command-drag-handle" onPointerDown={(event) => startReorderDrag(event, command.id)}>
                      <Icons.GripVertical size={14} />
                    </span>
                    <Icon size={14} />
                    <button onClick={() => openCustomDialog(command)} type="button">
                      <span>{command.label}</span>
                      <code>{command.command}</code>
                    </button>
                    <div className="quick-command-row-actions">
                      <button
                        onClick={() => moveQuickCommand(connectionId, command.id, -1)}
                        disabled={index === 0}
                        type="button"
                        aria-label={t("terminal.quickCommandsMoveUp", { label: command.label })}
                        title={t("terminal.quickCommandsMoveUp", { label: command.label })}
                      >
                        <Icons.ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => moveQuickCommand(connectionId, command.id, 1)}
                        disabled={index === quickCommands.length - 1}
                        type="button"
                        aria-label={t("terminal.quickCommandsMoveDown", { label: command.label })}
                        title={t("terminal.quickCommandsMoveDown", { label: command.label })}
                      >
                        <Icons.ArrowDown size={13} />
                      </button>
                      <button
                        className="quick-command-delete"
                        onClick={() => removeQuickCommand(connectionId, command.id)}
                        type="button"
                        aria-label={t("terminal.quickCommandsDelete", { label: command.label })}
                      >
                        <Icons.Trash size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {customDialogOpen ? (
        <CustomCommandDialog
          command={editingCommand}
          connection={connection}
          connectionId={connectionId}
          onClose={() => {
            setCustomDialogOpen(false);
            setEditingCommand(null);
          }}
        />
      ) : null}
      {presetDialogOpen ? (
        <PresetLibraryDialog connectionId={connectionId} onClose={() => setPresetDialogOpen(false)} />
      ) : null}
    </div>
  );
}

function menuExpanded(expanded: boolean) {
  return {
    "aria-expanded": expanded,
    "aria-haspopup": "menu" as const,
  };
}

function CustomCommandDialog({
  command: existingCommand,
  connection,
  connectionId,
  onClose,
}: {
  command: QuickCommand | null;
  connection: Connection | undefined;
  connectionId: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const addQuickCommand = useWorkspaceStore((state) => state.addQuickCommand);
  const updateQuickCommand = useWorkspaceStore((state) => state.updateQuickCommand);
  const aiProviderSettings = useWorkspaceStore((state) => state.aiProviderSettings);
  const aiProviderHasApiKey = useWorkspaceStore((state) => state.aiProviderHasApiKey);
  const [openPicker, setOpenPicker] = useState<"icon" | "color" | null>(null);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [draft, setDraft] = useState<QuickCommandDraft>(
    existingCommand
      ? {
          label: existingCommand.label,
          command: existingCommand.command,
          iconName: existingCommand.iconName,
          accentName: existingCommand.accentName,
          sendEnter: existingCommand.sendEnter,
          confirm: existingCommand.confirm,
        }
      : DEFAULT_DRAFT,
  );
  const SelectedIcon = iconFor(draft.iconName);
  const selectedAccent = accentFor(draft.accentName);
  const commandInputId = useId();
  const canGenerateWithAi = aiProviderHasApiKey && isTauriRuntime();

  async function generateCommandFromAi() {
    const normalizedPrompt = aiPrompt.trim();
    if (!normalizedPrompt || aiGenerating) {
      return;
    }
    setAiGenerating(true);
    setAiError("");
    try {
      const response = await invokeCommand("run_ai_agent", {
        request: {
          prompt: [
            "Generate exactly one shell command for a KKTerm Quick Command.",
            "Return only the command text. No markdown, no code fence, no explanation.",
            "The command should fit this Connection context and the user's request.",
            "If a required resource name is unknown, use a clear placeholder such as <service-name>.",
            "",
            "Connection context:",
            connectionAiContext(connection),
            "",
            `User request: ${normalizedPrompt}`,
          ].join("\n"),
          contextLabel: connection ? `${connection.name} Quick Command` : "Quick Command",
          messages: [],
          outputLanguage: aiProviderSettings.outputLanguage,
          allowTools: false,
        },
      });
      const commandText = sanitizeGeneratedCommand(response.content);
      if (commandText) {
        setDraft((current) => ({
          ...current,
          command: commandText,
          label: current.label || normalizedPrompt,
        }));
        setAiPromptOpen(false);
        setAiPrompt("");
      }
    } catch (error) {
      setAiError(t("terminal.quickCommandsAiFailed", { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setAiGenerating(false);
    }
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = draft.label.trim();
    const commandText = draft.command.trim();
    if (!label || !commandText) {
      return;
    }
    const saved: QuickCommand = {
      ...draft,
      id: existingCommand?.id ?? quickCommandId(),
      label,
      command: commandText,
    };
    if (existingCommand) {
      updateQuickCommand(connectionId, saved);
    } else {
      addQuickCommand(connectionId, saved);
    }
    onClose();
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop quick-command-subdialog-backdrop" role="presentation">
      <div className="connection-dialog quick-command-dialog quick-command-custom-dialog" role="dialog" aria-modal="true" aria-label={t("terminal.quickCommandsCustomCommand")}>
        <header className="connection-dialog-header compact">
          <div>
            <h2>{existingCommand ? t("common.edit") : `${t("common.add")} ${t("terminal.quickCommandsCustomCommand")}`}</h2>
          </div>
          <button className="connection-dialog-close" onClick={onClose} type="button" aria-label={t("common.close")}>
            <Icons.X size={16} />
          </button>
        </header>

        <form className="quick-command-custom-form" onSubmit={saveDraft}>
                <div className="quick-command-appearance-row">
                  <div className="quick-command-selector">
                    <span>{t("terminal.quickCommandsIcon")}</span>
                    <button
                      className="quick-command-selector-button"
                      onClick={() => setOpenPicker(openPicker === "icon" ? null : "icon")}
                      type="button"
                      {...menuExpanded(openPicker === "icon")}
                    >
                      <SelectedIcon size={12} />
                    </button>
                    {openPicker === "icon" ? (
                      <div className="quick-command-mini-dialog quick-command-icon-grid" role="dialog" aria-label={t("terminal.quickCommandsIcon")}>
                        {ICON_NAMES.map((name) => {
                          const Icon = iconFor(name);
                          return (
                            <button
                              className={draft.iconName === name ? "active" : ""}
                              key={name}
                              onClick={() => {
                                setDraft({ ...draft, iconName: name as IconName });
                                setOpenPicker(null);
                              }}
                              type="button"
                              aria-label={name}
                            >
                              <Icon size={13} />
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="quick-command-selector">
                    <span>{t("terminal.quickCommandsColor")}</span>
                    <button
                      className="quick-command-selector-button"
                      onClick={() => setOpenPicker(openPicker === "color" ? null : "color")}
                      style={{ "--quick-command-accent": selectedAccent.color } as CSSProperties}
                      type="button"
                      {...menuExpanded(openPicker === "color")}
                    />
                    {openPicker === "color" ? (
                      <div className="quick-command-mini-dialog quick-command-color-grid" role="dialog" aria-label={t("terminal.quickCommandsColor")}>
                        {ACCENT_PALETTE.map((accent) => (
                          <button
                            className={draft.accentName === accent.name ? "active" : ""}
                            key={accent.name}
                            onClick={() => {
                              setDraft({ ...draft, accentName: accent.name });
                              setOpenPicker(null);
                            }}
                            style={{ "--quick-command-accent": accent.color } as CSSProperties}
                            type="button"
                            aria-label={accent.name}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <label>
                  {t("terminal.quickCommandsLabel")}
                  <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.currentTarget.value })} />
                </label>
                <div className="quick-command-command-field">
                  <div className="quick-command-field-header">
                    <div className="quick-command-command-label">
                      <label htmlFor={commandInputId}>{t("terminal.quickCommandsCommand")}</label>
                    {canGenerateWithAi ? (
                      <button
                        className="quick-command-ai-button"
                        onClick={() => {
                          setAiPromptOpen((open) => !open);
                          setAiError("");
                        }}
                        title={t("terminal.quickCommandsGenerateWithAi")}
                        type="button"
                        aria-label={t("terminal.quickCommandsGenerateWithAi")}
                      >
                        <Icons.WandSparkles size={13} />
                      </button>
                    ) : null}
                    </div>
                  </div>
                  <div className="quick-command-command-input-wrap">
                    <textarea
                      id={commandInputId}
                      value={draft.command}
                      onChange={(event) => setDraft({ ...draft, command: event.currentTarget.value })}
                      rows={4}
                    />
                    {aiPromptOpen ? (
                      <div className="quick-command-ai-popover" role="dialog" aria-label={t("terminal.quickCommandsGenerateWithAi")}>
                        <label>
                          {t("terminal.quickCommandsAiPromptLabel")}
                          <input
                            onChange={(event) => setAiPrompt(event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void generateCommandFromAi();
                              }
                            }}
                            placeholder={t("terminal.quickCommandsAiPromptPlaceholder")}
                            value={aiPrompt}
                          />
                        </label>
                        {aiError ? <p className="quick-command-ai-error">{aiError}</p> : null}
                        <div className="quick-command-ai-actions">
                          <button className="primary-button" disabled={!aiPrompt.trim() || aiGenerating} onClick={() => void generateCommandFromAi()} type="button">
                            {aiGenerating ? t("terminal.quickCommandsAiGenerating") : t("terminal.quickCommandsAiGenerate")}
                          </button>
                          <button className="toolbar-button" disabled={aiGenerating} onClick={() => setAiPromptOpen(false)} type="button">
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="quick-command-toggle-list">
                  <div className="quick-command-toggle-row">
                    <span>{t("terminal.quickCommandsSendEnter")}</span>
                    <ToggleSwitch checked={draft.sendEnter} onChange={(sendEnter) => setDraft({ ...draft, sendEnter })} />
                  </div>
                  <div className="quick-command-toggle-row">
                    <span>{t("terminal.quickCommandsRequireConfirm")}</span>
                    <ToggleSwitch checked={draft.confirm} onChange={(confirm) => setDraft({ ...draft, confirm })} />
                  </div>
                </div>
                <div className="dialog-actions quick-command-custom-actions">
                  <button className="primary-button" type="submit">
                    {existingCommand ? t("common.save") : t("terminal.quickCommandsCreate")}
                  </button>
                  <button className="toolbar-button" onClick={onClose} type="button">
                    {t("common.cancel")}
                  </button>
                </div>
        </form>
      </div>
    </div>
  );
}

function PresetLibraryDialog({
  connectionId,
  onClose,
}: {
  connectionId: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const addQuickCommand = useWorkspaceStore((state) => state.addQuickCommand);
  const [query, setQuery] = useState("");

  const filteredLibrary = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return QUICK_COMMAND_LIBRARY;
    }
    return QUICK_COMMAND_LIBRARY.filter((entry) =>
      [
        t(entry.sectionKey),
        t(entry.subsectionKey),
        t(entry.labelKey),
        entry.command,
        t(entry.descriptionKey),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, t]);

  const groupedLibrary = filteredLibrary.reduce<Record<string, QuickCommandLibraryEntry[]>>((groups, entry) => {
    const key = `${t(entry.sectionKey)} / ${t(entry.subsectionKey)}`;
    groups[key] = [...(groups[key] ?? []), entry];
    return groups;
  }, {});

  return (
    <div className="dialog-backdrop connection-dialog-backdrop quick-command-subdialog-backdrop" role="presentation">
      <div className="connection-dialog quick-command-dialog quick-command-preset-dialog" role="dialog" aria-modal="true" aria-label={t("terminal.quickCommandsLibrary")}>
        <header className="connection-dialog-header compact">
          <div>
            <h2>{`${t("common.add")} ${t("terminal.quickCommandsLibrary")}`}</h2>
          </div>
          <button className="connection-dialog-close" onClick={onClose} type="button" aria-label={t("common.close")}>
            <Icons.X size={16} />
          </button>
        </header>
        <section className="quick-command-library">
          <input
            aria-label={t("common.search")}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("terminal.quickCommandsSearch")}
            value={query}
          />
          {Object.entries(groupedLibrary).map(([group, entries]) => (
            <section className="quick-command-library-group" key={group}>
              <h3>{group}</h3>
              {entries.map((entry) => (
                <article className="quick-command-library-entry" key={entry.libraryId}>
                  <div>
                    <strong>{t(entry.labelKey)}</strong>
                    <p>{t(entry.descriptionKey)}</p>
                    <code>{entry.command}</code>
                  </div>
                  <button className="toolbar-button" onClick={() => addQuickCommand(connectionId, commandFromLibrary(entry, t))} type="button">
                    <Icons.Plus size={13} />
                    {t("terminal.quickCommandsAdd")}
                  </button>
                </article>
              ))}
            </section>
          ))}
          {filteredLibrary.length === 0 ? (
            <p className="quick-command-muted">{t("terminal.quickCommandsNoLibraryMatches")}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
