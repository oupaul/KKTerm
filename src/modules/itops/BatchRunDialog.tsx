// Launch a Batch Run: pick a Site, then either a one-shot script body or
// an interactive Playbook (an ordered expect-style step sequence run over a
// single shell — docs/ITOPS.md). Built from the shared dialog primitives.

import { useMemo, useState } from "react";
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
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from "../../app/ui/dialog";
import type { BatchTask, RunScope } from "../../types";
import { useWorkspaceStore } from "../../store";
import { ItIcon, IT_ACCENTS, type ItIconName } from "./icons";
import { useItOpsStore } from "./state";
import { taskDisplayName } from "./taskCatalog";

function scopeIsSet(scope?: RunScope | null): scope is RunScope {
  return !!scope && !!(scope.rackId || scope.serverRoom || scope.hostIds?.length);
}

interface BatchPreviewNodeData extends Record<string, unknown> {
  icon: ItIconName;
  color: string;
  label: string;
  sub: string;
  selected: boolean;
  source: boolean;
  target: boolean;
  mono: boolean;
}

function BatchPreviewNode({ data }: NodeProps<Node<BatchPreviewNodeData>>) {
  return (
    <div className={`au-node pb-node${data.selected ? " sel" : ""}${data.mono ? " mono" : ""}`}>
      {data.target ? <Handle type="target" position={Position.Left} className="au-handle" /> : null}
      <span className="au-node-ic" style={{ background: data.color }}><ItIcon name={data.icon} size={15} /></span>
      <span className="au-node-tx"><span className="au-node-lab">{data.label}</span><span className="au-node-sub">{data.sub}</span></span>
      {data.source ? <Handle type="source" position={Position.Right} className="au-handle" /> : null}
    </div>
  );
}

const batchPreviewNodeTypes = { task: BatchPreviewNode };

function ReadonlyScriptTask({ task, description }: { task: Extract<BatchTask, { kind: "script" }>; description: string }) {
  const { t } = useTranslation();
  const lineCount = Math.max(task.body.split("\n").length, 16);
  return (
    <div className="pb-script-editor br-script-preview">
      <div className="pb-script-meta">
        <Field label={t("itops.tasks.descriptionLabel")}>
          <TextArea readOnly rows={5} value={description || t("itops.tasks.noDescription")} />
        </Field>
        <Field label={t("itops.tasks.shellLabel")}>
          <TextInput readOnly mono value={task.shell || t("itops.tasks.shellPlaceholder")} />
        </Field>
      </div>
      <div className="pb-script-main">
        <span className="pb-script-label">{t("itops.tasks.scriptLabel")}</span>
        <div className="pb-code-editor">
          <div className="pb-code-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
          <pre className="pb-script-body br-readonly-code"><code>{task.body}</code></pre>
        </div>
      </div>
    </div>
  );
}

function ReadonlyPlaybookTask({ task, description }: { task: Extract<BatchTask, { kind: "playbook" }>; description: string }) {
  const { t } = useTranslation();
  const stepIds = task.steps.map((step, index) => step.id || `preview-step-${index}`);
  const [selectedId, setSelectedId] = useState(stepIds[0] ?? "start");
  const selectedIndex = stepIds.indexOf(selectedId);
  const selectedStep = selectedIndex >= 0 ? task.steps[selectedIndex] : null;

  const nodes = useMemo<Node<BatchPreviewNodeData>[]>(() => {
    const list: Node<BatchPreviewNodeData>[] = [{
      id: "start", type: "task", position: { x: 0, y: 150 }, draggable: false,
      data: { icon: "run", color: IT_ACCENTS.green, label: t("itops.tasks.startNode"), sub: t("itops.tasks.startNodeSub"), selected: selectedId === "start", source: true, target: false, mono: false },
    }];
    task.steps.forEach((step, index) => {
      const kind = step.kind === "sudo" || step.kind === "ai" ? step.kind : "command";
      list.push({
        id: stepIds[index], type: "task", position: { x: 266 + index * 266, y: 150 }, draggable: false,
        data: {
          icon: kind === "sudo" ? "ssh" : kind === "ai" ? "bot" : "code",
          color: kind === "sudo" ? IT_ACCENTS.orange : kind === "ai" ? IT_ACCENTS.purple : IT_ACCENTS.blue,
          label: step.name.trim() || (kind === "sudo" ? t("itops.tasks.sudoNode") : kind === "ai" ? t("itops.tasks.aiNode") : t("itops.tasks.commandNode")),
          sub: kind === "sudo" ? t("itops.tasks.credentialStored") : kind === "ai" ? (step.aiInstruction?.trim() || t("itops.tasks.aiUnset")) : (step.send.trim() || t("itops.tasks.commandUnset")),
          selected: selectedId === stepIds[index], source: true, target: true, mono: kind === "command",
        },
      });
    });
    list.push({
      id: "end", type: "task", position: { x: 266 + task.steps.length * 266, y: 150 }, draggable: false,
      data: { icon: "stop", color: IT_ACCENTS.teal, label: t("itops.tasks.endNode"), sub: t("itops.tasks.endNodeSub"), selected: selectedId === "end", source: false, target: true, mono: false },
    });
    return list;
  }, [selectedId, stepIds, t, task.steps]);

  const edges = useMemo<Edge[]>(() => {
    const ids = ["start", ...stepIds, "end"];
    return ids.slice(0, -1).map((source, index) => ({
      id: `preview-edge-${index}`,
      source,
      target: ids[index + 1],
      type: "straight",
      className: "au-edge",
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    }));
  }, [stepIds]);

  const kind = selectedStep?.kind === "sudo" || selectedStep?.kind === "ai" ? selectedStep.kind : "command";
  return (
    <div className="au-editor-body br-playbook-preview">
      <div className="au-canvas pb-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={batchPreviewNodeTypes}
          onNodeClick={(_event, node) => setSelectedId(node.id)}
          nodesConnectable={false}
          nodesDraggable={false}
          edgesFocusable={false}
          elementsSelectable
          deleteKeyCode={null}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <aside className="au-side"><div className="au-side-in">
        {selectedStep ? (
          <>
            <div className="pb-side-heading">
              <span className={`pb-side-icon ${kind}`}><ItIcon name={kind === "sudo" ? "ssh" : kind === "ai" ? "bot" : "code"} size={16} /></span>
              <div><div className="au-side-title">{kind === "sudo" ? t("itops.tasks.sudoNode") : kind === "ai" ? t("itops.tasks.aiNode") : t("itops.tasks.commandNode")}</div><p className="au-side-hint">{kind === "sudo" ? t("itops.tasks.sudoNodeHint") : kind === "ai" ? t("itops.tasks.aiNodeHint") : t("itops.tasks.commandNodeHint")}</p></div>
            </div>
            <Field label={t("itops.batchRuns.stepNameLabel")}><TextInput readOnly value={selectedStep.name} /></Field>
            {kind === "command" ? <Field label={t("itops.tasks.commandLabel")}><TextArea readOnly className="mono" rows={5} value={selectedStep.send} /></Field> : null}
            {kind === "ai" ? <Field label={t("itops.tasks.aiInstructionLabel")}><TextArea readOnly rows={6} value={selectedStep.aiInstruction ?? ""} /></Field> : null}
            {kind === "sudo" ? <div className="pb-secret-state stored"><ItIcon name="check" size={13} />{t("itops.tasks.credentialStoredDetail")}</div> : null}
            {kind !== "ai" ? <Field label={kind === "sudo" ? t("itops.tasks.promptLabel") : t("itops.batchRuns.stepExpectLabel")}><TextInput readOnly mono value={selectedStep.expect ?? ""} /></Field> : null}
            <Field label={t("itops.batchRuns.stepTimeoutLabel")}><TextInput readOnly value={selectedStep.timeoutSeconds == null ? t("itops.batchRuns.stepTimeoutPlaceholder") : String(selectedStep.timeoutSeconds)} /></Field>
          </>
        ) : (
          <><div className="au-side-title">{t("itops.tasks.workflowHeading")}</div><p className="au-side-hint">{description || t("itops.tasks.noDescription")}</p></>
        )}
      </div></aside>
    </div>
  );
}

function ReadonlyTaskDefinition({ name, description, task }: { name: string; description: string; task: BatchTask }) {
  const { t } = useTranslation();
  return (
    <section className="br-task-preview" aria-label={name}>
      <header className="br-task-preview-head">
        <span className="au-editor-tile"><ItIcon name={task.kind === "script" ? "code" : "book"} size={17} /></span>
        <div><strong>{name}</strong><span>{description || t("itops.tasks.noDescription")}</span></div>
        <span className="br-task-kind">{t(`itops.tasks.kind.${task.kind}`)}</span>
      </header>
      {task.kind === "script"
        ? <ReadonlyScriptTask task={task} description={description} />
        : <ReadonlyPlaybookTask task={task} description={description} />}
    </section>
  );
}

export function BatchRunDialog({
  defaultGroupId,
  defaultScope,
  defaultTask,
  onClose,
  onStarted,
}: {
  defaultGroupId?: string | null;
  defaultScope?: RunScope | null;
  defaultTask?: BatchTask | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const sites = useItOpsStore((state) => state.sites);
  const tasks = useItOpsStore((state) => state.tasks);
  const racksBySite = useItOpsStore((state) => state.racksBySite);
  const startBatchRun = useItOpsStore((state) => state.startBatchRun);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);

  const [groupId, setGroupId] = useState(defaultGroupId ?? sites[0]?.id ?? "");
  // A scoped run targets only the placed hosts in the matching racks; the scope
  // is fixed for the launch (it came from a rack/region/area "Run" affordance).
  const scope = scopeIsSet(defaultScope) ? defaultScope : null;
  const scopeLabel = (() => {
    if (!scope) return "";
    if (scope.hostIds?.length) {
      return t("itops.batchRuns.scopeSelectedHosts", { count: scope.hostIds.length });
    }
    if (scope.rackId) {
      const rack = (racksBySite[groupId] ?? []).find((entry) => entry.id === scope.rackId);
      return t("itops.batchRuns.scopeRack", { name: rack?.name ?? scope.rackId });
    }
    return t("itops.batchRuns.scopeServerRoom", { name: scope.serverRoom ?? "" });
  })();
  const [body, setBody] = useState(defaultTask?.kind === "script" ? defaultTask.body : "");
  const [busy, setBusy] = useState(false);
  const [taskSourceId, setTaskSourceId] = useState(() => {
    if (!defaultTask) return "";
    return tasks.find((entry) => JSON.stringify(entry.task) === JSON.stringify(defaultTask))?.id ?? "";
  });
  const selectedTask = tasks.find((entry) => entry.id === taskSourceId) ?? null;

  const hasGroups = sites.length > 0;
  const selectedDefinitionReady = selectedTask?.task.kind === "script"
    ? selectedTask.task.body.trim().length > 0
    : !!selectedTask && selectedTask.task.name.trim().length > 0 && selectedTask.task.steps.length > 0;
  const taskReady = selectedTask ? selectedDefinitionReady : body.trim().length > 0;
  const canRun = hasGroups && groupId.length > 0 && taskReady && !busy;

  function selectTaskSource(id: string) {
    setTaskSourceId(id);
    const selected = tasks.find((entry) => entry.id === id);
    if (!selected) return;
    if (selected.task.kind === "script") {
      setBody(selected.task.body);
    }
  }

  function buildTask(): BatchTask {
    return selectedTask?.task ?? { kind: "script", body };
  }

  async function handleRun() {
    if (!canRun) {
      return;
    }
    setBusy(true);
    try {
      await startBatchRun(groupId, buildTask(), scope, taskSourceId || null);
      showStatusBarNotice(t("itops.batchRuns.startedNotice"), { tone: "success" });
      onStarted();
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
        width={selectedTask ? 1040 : 580}
        height={selectedTask ? 760 : undefined}
        className={selectedTask ? "br-launch-sheet has-task-preview" : "br-launch-sheet"}
        title={t("itops.batchRuns.launchTitle")}
        ariaLabel={t("itops.batchRuns.launchTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="bolt" onClick={() => void handleRun()} disabled={!canRun}>
                {t("itops.actions.run")}
              </Btn>
            }
          />
        }
      >
        {hasGroups ? (
          <>
            <div className="br-launch-config">
              <Field label={t("itops.batchRuns.siteLabel")} req>
                <Select
                  value={groupId}
                  disabled={!!scope}
                  onChange={(event) => setGroupId(event.currentTarget.value)}
                  options={sites.map((group) => ({ value: group.id, label: group.name }))}
                />
              </Field>
              <Field label={t("itops.batchRuns.taskSourceLabel")}>
                <Select
                  value={taskSourceId}
                  onChange={(event) => selectTaskSource(event.currentTarget.value)}
                  options={[
                    { value: "", label: t("itops.batchRuns.adHocTask") },
                    ...tasks.map((entry) => ({ value: entry.id, label: taskDisplayName(t, entry) })),
                  ]}
                />
              </Field>
              {scope ? <div className="it-scope-note">{scopeLabel}</div> : null}
            </div>
            {selectedTask ? (
              <ReadonlyTaskDefinition key={selectedTask.id} name={taskDisplayName(t, selectedTask)} description={selectedTask.description} task={selectedTask.task} />
            ) : (
              <Field label={t("itops.batchRuns.scriptLabel")} req>
                <TextArea
                  value={body}
                  rows={10}
                  spellCheck={false}
                  placeholder={t("itops.batchRuns.scriptPlaceholder")}
                  onChange={(event) => setBody(event.currentTarget.value)}
                />
              </Field>
            )}
          </>
        ) : (
          <div className="hg-dlg-empty">{t("itops.batchRuns.noGroups")}</div>
        )}
      </Sheet>
    </DialogShell>
  );
}
