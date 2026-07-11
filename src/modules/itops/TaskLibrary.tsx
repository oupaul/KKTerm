import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet, Actions, Btn, DialogShell, Field, Sheet, TextArea, TextInput } from "../../app/ui/dialog";
import { useWorkspaceStore } from "../../store";
import type { BatchTask, ItopsTask } from "../../types";
import { ItIcon } from "./icons";
import { ItOpsEmptyHint } from "./ItOpsEmptyHint";
import { useItOpsStore } from "./state";

function TaskDialog({ task, onClose }: { task: ItopsTask | null; onClose: () => void }) {
  const { t } = useTranslation();
  const createTask = useItOpsStore((state) => state.createTask);
  const updateTask = useItOpsStore((state) => state.updateTask);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const script = task?.task.kind === "script" ? task.task : null;
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [body, setBody] = useState(script?.body ?? "");
  const [shell, setShell] = useState(script?.shell ?? "");
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length > 0 && body.trim().length > 0 && !busy;

  async function save() {
    if (!ready) return;
    setBusy(true);
    const next: BatchTask = { kind: "script", body, shell: shell.trim() || null };
    try {
      if (task) await updateTask(task.id, name, description, next);
      else await createTask(name, description, next);
      showStatusBarNotice(t("itops.tasks.savedNotice", { name: name.trim() }), { tone: "success" });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={560}
        title={task ? t("itops.tasks.editTitle") : t("itops.tasks.newTitle")}
        ariaLabel={task ? t("itops.tasks.editTitle") : t("itops.tasks.newTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={<Btn kind="primary" icon="check" onClick={() => void save()} disabled={!ready}>{t("itops.actions.save")}</Btn>}
          />
        }
      >
        <Field label={t("itops.tasks.nameLabel")} req>
          <TextInput value={name} onChange={(event) => setName(event.currentTarget.value)} />
        </Field>
        <Field label={t("itops.tasks.descriptionLabel")}>
          <TextInput value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
        </Field>
        <Field label={t("itops.tasks.shellLabel")}>
          <TextInput mono value={shell} placeholder={t("itops.tasks.shellPlaceholder")} onChange={(event) => setShell(event.currentTarget.value)} />
        </Field>
        <Field label={t("itops.tasks.scriptLabel")} req>
          <TextArea className="mono" rows={10} value={body} onChange={(event) => setBody(event.currentTarget.value)} />
        </Field>
        {task?.task.kind === "playbook" ? <p className="it-task-note">{t("itops.tasks.playbookEditLater")}</p> : null}
      </Sheet>
    </DialogShell>
  );
}

function taskKind(task: ItopsTask): "script" | "playbook" {
  return task.task.kind;
}

export function TaskLibrary() {
  const { t } = useTranslation();
  const tasks = useItOpsStore((state) => state.tasks);
  const loaded = useItOpsStore((state) => state.tasksLoaded);
  const loadTasks = useItOpsStore((state) => state.loadTasks);
  const removeTask = useItOpsStore((state) => state.removeTask);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ItopsTask | null | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ItopsTask | null>(null);

  useEffect(() => { if (!loaded) void loadTasks(); }, [loaded, loadTasks]);
  useEffect(() => {
    if (!tasks.length) setSelectedId(null);
    else if (!tasks.some((task) => task.id === selectedId)) setSelectedId(tasks[0].id);
  }, [selectedId, tasks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? tasks.filter((task) => `${task.name} ${task.description}`.toLowerCase().includes(needle)) : tasks;
  }, [query, tasks]);
  const selected = tasks.find((task) => task.id === selectedId) ?? null;

  async function confirmDelete() {
    if (!pendingDelete) return;
    const task = pendingDelete;
    setPendingDelete(null);
    try {
      await removeTask(task.id);
      showStatusBarNotice(t("itops.tasks.deletedNotice", { name: task.name }), { tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
    }
  }

  return (
    <div className="it-task-library-page it-destination-surface">
      <div className="it-destination-page-head">
        <div>
          <h2>{t("itops.tasks.heading")}</h2>
          <p>{t("itops.tasks.pageDescription")}</p>
        </div>
        <button type="button" className="it-btn primary" onClick={() => setEditor(null)}>
          <ItIcon name="plus" size={14} />
          {t("itops.tasks.newTitle")}
        </button>
      </div>
      <div className="it-task-library">
        <aside className="it-task-list">
          <label className="it-task-search">
            <ItIcon name="search" size={13} />
            <input value={query} placeholder={t("itops.tasks.searchPlaceholder")} onChange={(event) => setQuery(event.currentTarget.value)} />
          </label>
          <div className="it-task-rows">
            {filtered.map((task) => (
              <button key={task.id} type="button" className="it-task-row" data-active={task.id === selectedId} onClick={() => setSelectedId(task.id)}>
                <span className="it-task-row-icon"><ItIcon name={taskKind(task) === "script" ? "code" : "book"} size={15} /></span>
                <span><strong>{task.name}</strong><small>{t(`itops.tasks.kind.${taskKind(task)}`)}</small></span>
              </button>
            ))}
          </div>
        </aside>

        <main className="it-task-detail">
          {selected ? (
            <>
              <header className="it-task-detail-head">
                <span className="it-task-detail-icon"><ItIcon name={taskKind(selected) === "script" ? "code" : "book"} size={20} /></span>
                <div><h2>{selected.name}</h2><p>{selected.description || t("itops.tasks.noDescription")}</p></div>
                <span className="it-task-spacer" />
                <button type="button" className="it-btn" onClick={() => setEditor(selected)}><ItIcon name="edit" size={14} />{t("itops.actions.edit")}</button>
                <button type="button" className="it-btn" onClick={() => setPendingDelete(selected)}><ItIcon name="trash" size={14} />{t("itops.actions.delete")}</button>
              </header>
              <section className="it-task-definition">
                <div className="it-section-label">{t("itops.tasks.definitionHeading")}</div>
                {selected.task.kind === "script" ? <pre>{selected.task.body}</pre> : (
                  <div className="it-task-steps">{selected.task.steps.map((step, index) => <div key={index}><strong>{index + 1}. {step.name || step.send}</strong><code>{step.send}</code></div>)}</div>
                )}
              </section>
            </>
          ) : loaded ? (
            <ItOpsEmptyHint>{t("itops.tasks.emptyBody")}</ItOpsEmptyHint>
          ) : null}
        </main>
      </div>

      {editor !== undefined ? <TaskDialog task={editor} onClose={() => setEditor(undefined)} /> : null}
      {pendingDelete ? <ConfirmSheet tone="danger" title={t("itops.tasks.deleteTitle")} message={t("itops.tasks.deleteBody", { name: pendingDelete.name })} confirmLabel={t("itops.actions.delete")} confirmIcon="trash" onConfirm={() => void confirmDelete()} onCancel={() => setPendingDelete(null)} /> : null}
    </div>
  );
}
