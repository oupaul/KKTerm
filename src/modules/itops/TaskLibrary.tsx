import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ConfirmSheet, Btn, DialogShell, Field, Segmented, TextArea, TextInput } from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { BatchTask, ItopsTask, PlaybookStep } from "../../types";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { ItOpsEmptyHint } from "./ItOpsEmptyHint";
import { useItOpsStore } from "./state";

type TaskMode = "script" | "playbook";
type EditorStep = PlaybookStep & { id: string; kind: "command" | "sudo" | "ai" };

function newId(prefix: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function commandStep(): EditorStep {
  return { id: newId("step"), kind: "command", name: "", send: "", expect: "", timeoutSeconds: null, secretOwnerId: null };
}

function sudoStep(): EditorStep {
  return {
    id: newId("step"),
    kind: "sudo",
    name: "",
    send: "",
    expect: "KKTerm sudo password: ",
    timeoutSeconds: 30,
    secretOwnerId: newId("itops-sudo"),
    aiInstruction: null,
  };
}

function aiStep(): EditorStep {
  return {
    id: newId("step"),
    kind: "ai",
    name: "",
    send: "",
    expect: null,
    timeoutSeconds: 120,
    secretOwnerId: null,
    aiInstruction: "",
  };
}

function normalizeStep(step: PlaybookStep): EditorStep {
  return {
    ...step,
    id: step.id || newId("step"),
    kind: step.kind === "sudo" || step.kind === "ai" ? step.kind : "command",
    secretOwnerId: step.secretOwnerId ?? null,
    aiInstruction: step.aiInstruction ?? null,
  };
}

interface TaskNodeData extends Record<string, unknown> {
  icon: ItIconName;
  color: string;
  label: string;
  sub: string;
  selected: boolean;
  source: boolean;
  target: boolean;
}

function TaskNode({ data }: NodeProps<Node<TaskNodeData>>) {
  return (
    <div className={`au-node pb-node${data.selected ? " sel" : ""}`}>
      {data.target ? <Handle type="target" position={Position.Left} className="au-handle" /> : null}
      <span className="au-node-ic" style={{ background: data.color }}><ItIcon name={data.icon} size={15} /></span>
      <span className="au-node-tx"><span className="au-node-lab">{data.label}</span><span className="au-node-sub">{data.sub}</span></span>
      {data.source ? <Handle type="source" position={Position.Right} className="au-handle" /> : null}
    </div>
  );
}

const taskNodeTypes = { task: TaskNode };
const taskEdgeStyle = { markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, className: "au-edge" } as const;

function TaskEditor({ task, onClose }: { task: ItopsTask | null; onClose: () => void }) {
  const { t } = useTranslation();
  const createTask = useItOpsStore((state) => state.createTask);
  const updateTask = useItOpsStore((state) => state.updateTask);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const initialMode: TaskMode = task?.task.kind ?? "script";
  const script = task?.task.kind === "script" ? task.task : null;
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [mode, setMode] = useState<TaskMode>(initialMode);
  const [body, setBody] = useState(script?.body ?? "");
  const [shell, setShell] = useState(script?.shell ?? "");
  const [steps, setSteps] = useState<EditorStep[]>(() => task?.task.kind === "playbook" ? task.task.steps.map(normalizeStep) : [commandStep()]);
  const [selectedId, setSelectedId] = useState(() => steps[0]?.id ?? "start");
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [secretPresence, setSecretPresence] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const selectedStep = steps.find((step) => step.id === selectedId) ?? null;

  useEffect(() => {
    const ownerIds = steps
      .filter((step) => step.kind === "sudo")
      .map((step) => step.secretOwnerId)
      .filter((ownerId): ownerId is string => !!ownerId);
    for (const ownerId of ownerIds) {
      if (ownerId in secretPresence) continue;
      void invokeCommand("secret_exists", { request: { kind: "itopsTaskSecret", ownerId } })
        .then((result) => setSecretPresence((current) => ({ ...current, [ownerId]: result.exists })))
        .catch(() => setSecretPresence((current) => ({ ...current, [ownerId]: false })));
    }
  }, [secretPresence, steps]);

  const ready = useMemo(() => {
    if (!name.trim() || busy) return false;
    if (mode === "script") return body.trim().length > 0;
    if (steps.length === 0) return false;
    return steps.every((step) => {
      if (step.kind === "command") return step.send.trim().length > 0;
      if (step.kind === "ai") return !!step.aiInstruction?.trim();
      const ownerId = step.secretOwnerId ?? "";
      return !!ownerId && (secretPresence[ownerId] || !!secretDrafts[ownerId]?.trim());
    });
  }, [body, busy, mode, name, secretDrafts, secretPresence, steps]);

  const nodes = useMemo<Node<TaskNodeData>[]>(() => {
    const list: Node<TaskNodeData>[] = [{
      id: "start", type: "task", position: { x: 0, y: 150 }, draggable: false,
      data: { icon: "run", color: IT_ACCENTS.green, label: t("itops.tasks.startNode"), sub: t("itops.tasks.startNodeSub"), selected: selectedId === "start", source: true, target: false },
    }];
    steps.forEach((step, index) => {
      const isSudo = step.kind === "sudo";
      const isAi = step.kind === "ai";
      const ownerId = step.secretOwnerId ?? "";
      list.push({
        id: step.id, type: "task", position: { x: 245 + index * 235, y: 150 }, draggable: false,
        data: {
          icon: isSudo ? "ssh" : isAi ? "bot" : "code",
          color: isSudo ? IT_ACCENTS.orange : isAi ? IT_ACCENTS.purple : IT_ACCENTS.blue,
          label: step.name.trim() || (isSudo ? t("itops.tasks.sudoNode") : isAi ? t("itops.tasks.aiNode") : t("itops.tasks.commandNode")),
          sub: isSudo ? (secretPresence[ownerId] ? t("itops.tasks.credentialStored") : t("itops.tasks.credentialRequired")) : isAi ? (step.aiInstruction?.trim() || t("itops.tasks.aiUnset")) : (step.send.trim() || t("itops.tasks.commandUnset")),
          selected: selectedId === step.id, source: true, target: true,
        },
      });
    });
    list.push({
      id: "end", type: "task", position: { x: 245 + steps.length * 235, y: 150 }, draggable: false,
      data: { icon: "stop", color: IT_ACCENTS.teal, label: t("itops.tasks.endNode"), sub: t("itops.tasks.endNodeSub"), selected: selectedId === "end", source: false, target: true },
    });
    return list;
  }, [secretPresence, selectedId, steps, t]);

  const edges = useMemo<Edge[]>(() => {
    const ids = ["start", ...steps.map((step) => step.id), "end"];
    return ids.slice(0, -1).map((source, index) => ({ id: `task-edge-${index}`, source, target: ids[index + 1], ...taskEdgeStyle }));
  }, [steps]);

  function updateSelected(patch: Partial<EditorStep>) {
    if (!selectedStep) return;
    setSteps((current) => current.map((step) => step.id === selectedStep.id ? { ...step, ...patch } : step));
  }

  function addStep(kind: EditorStep["kind"]) {
    const next = kind === "sudo" ? sudoStep() : kind === "ai" ? aiStep() : commandStep();
    setSteps((current) => [...current, next]);
    setSelectedId(next.id);
  }

  async function storePendingSecrets(storedOwnerIds: string[]): Promise<void> {
    const activeOwnerIds = new Set(
      steps
        .filter((step) => step.kind === "sudo")
        .map((step) => step.secretOwnerId)
        .filter((ownerId): ownerId is string => !!ownerId),
    );
    for (const [ownerId, secret] of Object.entries(secretDrafts)) {
      if (!activeOwnerIds.has(ownerId) || !secret.trim()) continue;
      await invokeCommand("store_secret", { request: { kind: "itopsTaskSecret", ownerId, secret } });
      storedOwnerIds.push(ownerId);
      setSecretPresence((current) => ({ ...current, [ownerId]: true }));
    }
  }

  async function save() {
    if (!ready) return;
    setBusy(true);
    const storedOwnerIds: string[] = [];
    const next: BatchTask = mode === "script"
      ? { kind: "script", body, shell: shell.trim() || null }
      : {
          kind: "playbook",
          name: name.trim(),
          steps: steps.map((step) => ({
            id: step.id,
            kind: step.kind,
            name: step.name.trim(),
            send: step.kind === "command" ? step.send : "",
            expect: step.expect?.trim() || null,
            timeoutSeconds: step.timeoutSeconds ?? null,
            secretOwnerId: step.kind === "sudo" ? step.secretOwnerId : null,
            aiInstruction: step.kind === "ai" ? step.aiInstruction?.trim() || null : null,
          })),
        };
    try {
      await storePendingSecrets(storedOwnerIds);
      if (task) await updateTask(task.id, name, description, next);
      else await createTask(name, description, next);
      showStatusBarNotice(t("itops.tasks.savedNotice", { name: name.trim() }), { tone: "success" });
      onClose();
    } catch (error) {
      if (!task) {
        await Promise.allSettled(
          storedOwnerIds.map((ownerId) =>
            invokeCommand("delete_secret", { request: { kind: "itopsTaskSecret", ownerId } }),
          ),
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <div className="au-editor pb-editor" role="dialog" aria-modal="true" aria-label={task ? t("itops.tasks.editTitle") : t("itops.tasks.newTitle")}>
        <div className="au-editor-head">
          <span className="au-editor-tile"><ItIcon name="book" size={17} /></span>
          <input className="au-editor-name" value={name} placeholder={t("itops.tasks.namePlaceholder")} onChange={(event) => setName(event.currentTarget.value)} aria-label={t("itops.tasks.nameLabel")} />
          <Segmented value={mode} onChange={(value) => setMode(value as TaskMode)} options={[{ value: "script", label: t("itops.tasks.kind.script") }, { value: "playbook", label: t("itops.tasks.kind.playbook") }]} />
          <span className="au-editor-sp" />
          <Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>
          <Btn kind="primary" icon="check" onClick={() => void save()} disabled={!ready}>{t("itops.actions.save")}</Btn>
        </div>
        {mode === "script" ? (
          <div className="pb-script-editor">
            <div className="pb-script-meta">
              <Field label={t("itops.tasks.descriptionLabel")}><TextInput value={description} onChange={(event) => setDescription(event.currentTarget.value)} /></Field>
              <Field label={t("itops.tasks.shellLabel")}><TextInput mono value={shell} placeholder={t("itops.tasks.shellPlaceholder")} onChange={(event) => setShell(event.currentTarget.value)} /></Field>
            </div>
            <Field label={t("itops.tasks.scriptLabel")} req><TextArea className="mono pb-script-body" value={body} spellCheck={false} onChange={(event) => setBody(event.currentTarget.value)} /></Field>
          </div>
        ) : (
          <div className="au-editor-body">
            <div className="au-canvas pb-canvas">
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={taskNodeTypes} onNodeClick={(_event, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId("")} nodesConnectable={false} nodesDraggable={false} edgesFocusable={false} deleteKeyCode={null} fitView proOptions={{ hideAttribution: true }}>
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} /><Controls showInteractive={false} />
              </ReactFlow>
              <div className="pb-add-node"><span>{t("itops.tasks.addNode")}</span><Btn sm icon="plus" onClick={() => addStep("command")}>{t("itops.tasks.addCommand")}</Btn><Btn sm icon="plus" onClick={() => addStep("sudo")}>{t("itops.tasks.addSudo")}</Btn><Btn sm icon="plus" onClick={() => addStep("ai")}>{t("itops.tasks.addAi")}</Btn></div>
            </div>
            <aside className="au-side"><div className="au-side-in">
              {selectedStep ? (
                <>
                  <div className="pb-side-heading"><span className={`pb-side-icon ${selectedStep.kind}`}><ItIcon name={selectedStep.kind === "sudo" ? "ssh" : selectedStep.kind === "ai" ? "bot" : "code"} size={16} /></span><div><div className="au-side-title">{selectedStep.kind === "sudo" ? t("itops.tasks.sudoNode") : selectedStep.kind === "ai" ? t("itops.tasks.aiNode") : t("itops.tasks.commandNode")}</div><p className="au-side-hint">{selectedStep.kind === "sudo" ? t("itops.tasks.sudoNodeHint") : selectedStep.kind === "ai" ? t("itops.tasks.aiNodeHint") : t("itops.tasks.commandNodeHint")}</p></div></div>
                  <Field label={t("itops.batchRuns.stepNameLabel")}><TextInput value={selectedStep.name} placeholder={t("itops.batchRuns.stepNamePlaceholder")} onChange={(event) => updateSelected({ name: event.currentTarget.value })} /></Field>
                  {selectedStep.kind === "command" ? <Field label={t("itops.tasks.commandLabel")} req><TextArea className="mono" rows={5} value={selectedStep.send} spellCheck={false} placeholder={t("itops.tasks.commandPlaceholder")} onChange={(event) => updateSelected({ send: event.currentTarget.value })} /></Field> : null}
                  {selectedStep.kind === "ai" ? <><Field label={t("itops.tasks.aiInstructionLabel")} req hint={t("itops.tasks.aiInstructionHint")}><TextArea rows={6} value={selectedStep.aiInstruction ?? ""} placeholder={t("itops.tasks.aiInstructionPlaceholder")} onChange={(event) => updateSelected({ aiInstruction: event.currentTarget.value })} /></Field><div className="pb-ai-contract"><strong>{t("itops.tasks.aiDecisionHeading")}</strong><span><code>continue</code>{t("itops.tasks.aiDecisionContinue")}</span><span><code>success</code>{t("itops.tasks.aiDecisionSuccess")}</span><span><code>fail</code>{t("itops.tasks.aiDecisionFail")}</span></div><p className="au-side-hint">{t("itops.tasks.aiInputHint")}</p></> : null}
                  {selectedStep.kind === "sudo" ? (
                    <>
                      <Field label={t("itops.tasks.promptLabel")} req hint={t("itops.tasks.promptHint")}><TextInput mono value={selectedStep.expect ?? ""} onChange={(event) => updateSelected({ expect: event.currentTarget.value })} /></Field>
                      <Field label={t("itops.tasks.credentialLabel")} req hint={t("itops.tasks.credentialHint")}>
                        <TextInput type="password" value={secretDrafts[selectedStep.secretOwnerId ?? ""] ?? ""} placeholder={secretPresence[selectedStep.secretOwnerId ?? ""] ? t("itops.tasks.credentialStoredPlaceholder") : t("itops.tasks.credentialPlaceholder")} onChange={(event) => { const ownerId = selectedStep.secretOwnerId ?? newId("itops-sudo"); if (!selectedStep.secretOwnerId) updateSelected({ secretOwnerId: ownerId }); setSecretDrafts((current) => ({ ...current, [ownerId]: event.currentTarget.value })); }} />
                      </Field>
                      <div className={`pb-secret-state ${secretPresence[selectedStep.secretOwnerId ?? ""] ? "stored" : "missing"}`}><ItIcon name={secretPresence[selectedStep.secretOwnerId ?? ""] ? "check" : "alert"} size={13} />{secretPresence[selectedStep.secretOwnerId ?? ""] ? t("itops.tasks.credentialStoredDetail") : t("itops.tasks.credentialMissingDetail")}</div>
                      <p className="au-side-hint">{t("itops.tasks.sudoCacheHint")}</p>
                    </>
                  ) : selectedStep.kind === "command" ? <Field label={t("itops.batchRuns.stepExpectLabel")} hint={t("itops.batchRuns.stepExpectHint")}><TextInput mono value={selectedStep.expect ?? ""} onChange={(event) => updateSelected({ expect: event.currentTarget.value })} /></Field> : null}
                  <Field label={t("itops.batchRuns.stepTimeoutLabel")}><TextInput type="number" min={1} value={selectedStep.timeoutSeconds == null ? "" : String(selectedStep.timeoutSeconds)} placeholder={t("itops.batchRuns.stepTimeoutPlaceholder")} onChange={(event) => { const raw = event.currentTarget.value; updateSelected({ timeoutSeconds: raw ? Number(raw) : null }); }} /></Field>
                  <Btn kind="danger" icon="trash" onClick={() => { setSteps((current) => current.filter((step) => step.id !== selectedStep.id)); setSelectedId("start"); }}>{t("itops.tasks.removeNode")}</Btn>
                </>
              ) : <><div className="au-side-title">{t("itops.tasks.workflowHeading")}</div><p className="au-side-hint">{t("itops.tasks.workflowHint")}</p><Field label={t("itops.tasks.descriptionLabel")}><TextArea rows={4} value={description} onChange={(event) => setDescription(event.currentTarget.value)} /></Field></>}
            </div></aside>
          </div>
        )}
      </div>
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
                  <div className="it-task-steps">{selected.task.steps.map((step, index) => <div key={step.id ?? index}><strong>{index + 1}. {step.name || (step.kind === "sudo" ? t("itops.tasks.sudoNode") : step.kind === "ai" ? t("itops.tasks.aiNode") : step.send)}</strong><code>{step.kind === "sudo" ? t("itops.tasks.credentialStored") : step.kind === "ai" ? step.aiInstruction : step.send}</code></div>)}</div>
                )}
              </section>
            </>
          ) : loaded ? (
            <ItOpsEmptyHint>{t("itops.tasks.emptyBody")}</ItOpsEmptyHint>
          ) : null}
        </main>
      </div>

      {editor !== undefined ? <TaskEditor task={editor} onClose={() => setEditor(undefined)} /> : null}
      {pendingDelete ? <ConfirmSheet tone="danger" title={t("itops.tasks.deleteTitle")} message={t("itops.tasks.deleteBody", { name: pendingDelete.name })} confirmLabel={t("itops.actions.delete")} confirmIcon="trash" onConfirm={() => void confirmDelete()} onCancel={() => setPendingDelete(null)} /> : null}
    </div>
  );
}
