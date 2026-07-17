// IT Ops Module page. Fills the workspace content area (like the Installer and
// Dashboard modules) and is shown/hidden by the App via the `active` flag while
// the shell stays mounted. See docs/ITOPS.md.

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AssistantPageContext } from "../../ai/AssistantPanel";
import { ItOpsModule } from "./ItOpsModule";
import { useItOpsStore } from "./state";
import "./itops.css";

export function ItOpsPage({
  active,
  siteTreeCollapsed,
  onAssistantContextChange,
  onShowWorkspace,
}: {
  active: boolean;
  siteTreeCollapsed: boolean;
  onAssistantContextChange: (context: AssistantPageContext) => void;
  /** Navigate the app shell to the Workspace Module. */
  onShowWorkspace: () => void;
}) {
  const { t } = useTranslation();
  const sites = useItOpsStore((state) => state.sites);
  const runHistory = useItOpsStore((state) => state.runHistory);
  const automations = useItOpsStore((state) => state.automations);
  const activeRun = useItOpsStore((state) => state.activeRun);
  const racksBySite = useItOpsStore((state) => state.racksBySite);
  const tasks = useItOpsStore((state) => state.tasks);
  const navigationSnapshot = useItOpsStore((state) => state.navigationSnapshot);

  useEffect(() => {
    // Compact rack-topology summary for whichever Sites have had their Rack
    // View opened (racks load on demand); never device-level detail or secrets.
    const rackSummary = Object.entries(racksBySite)
      .filter(([, racks]) => racks.length > 0)
      .map(([siteId, racks]) => {
        const name = sites.find((site) => site.id === siteId)?.name ?? siteId;
        const devices = racks.reduce((sum, rack) => sum + rack.items.length, 0);
        return `${name} [${racks.length} racks, ${devices} placed devices]`;
      })
      .join(", ");

    const selectedSiteName = navigationSnapshot?.siteId
      ? (sites.find((site) => site.id === navigationSnapshot.siteId)?.name ??
        navigationSnapshot.siteId)
      : null;
    const selectionSummary = navigationSnapshot
      ? navigationSnapshot.destination === "taskLibrary"
        ? "global Task Library"
        : [
            selectedSiteName ? `Site "${selectedSiteName}" (id ${navigationSnapshot.siteId})` : "no Site",
            `destination ${navigationSnapshot.destination}`,
            navigationSnapshot.serverRoom ? `Server Room "${navigationSnapshot.serverRoom}"` : null,
            navigationSnapshot.rackId ? `Rack id ${navigationSnapshot.rackId}` : null,
          ]
            .filter(Boolean)
            .join(", ")
      : "unknown";

    onAssistantContextChange({
      contextKind: "itops",
      contextLabel: t("itops.title"),
      connectionLabel: t("itops.title"),
      sourceLabel: `${t("itops.title")} context`,
      text: [
        "Active Module: IT Ops.",
        `Current navigator selection: ${selectionSummary}.`,
        "Tutorial targets: itops.sitesTree (left navigator), itops.siteView (Site topology drill-down), itops.hostsPanel, itops.hostsRunTask, itops.hostsImport, itops.hostsScan (Hosts page), itops.automationsPanel, itops.automationsNew (Automations page), itops.runHistoryPanel (Run History page), itops.taskLibrary, itops.taskLibraryNew (Task Library).",
        "Entity tutorial targets highlight one row: itops.site:<siteId>, itops.host:<hostId>, itops.automation:<automationId>, itops.task:<taskId>, itops.run:<runId> — use ids from the itops_* list tools and pass navigation.itopsSiteId/itopsDestination so the destination opens first.",
        `Sites (${sites.length}): ${sites.map((group) => `${group.name} [id ${group.id}, ${group.memberIds.length} saved members, ${group.transport}]`).join(", ") || "none"}.`,
        `Rack topology (loaded Sites only): ${rackSummary || "none loaded"}.`,
        `Automations (${automations.length}): ${automations.map((automation) => `${automation.name} [${automation.enabled ? "armed" : "disabled"}]`).join(", ") || "none"}.`,
        `Task Library: ${tasks.length} reusable Tasks (itops_list_tasks reads them).`,
        `Recent completed Batch Runs: ${runHistory.length}.`,
        activeRun
          ? `Live Batch Run: ${activeRun.taskSummary} [${activeRun.state}], ${activeRun.hosts.length} hosts.`
          : "Live Batch Run: none.",
        "For operational instructions, search and read the IT Ops chapter in the KKTerm Operation Manual before answering. Do not infer host output, scripts, secrets, or trigger details from this compact metadata.",
      ].join("\n"),
    });
  }, [activeRun, automations, sites, navigationSnapshot, onAssistantContextChange, racksBySite, runHistory, tasks, t]);

  return (
    <section
      className="itops-page"
      aria-label={t("itops.title")}
      data-active={active ? "true" : "false"}
    >
      <ItOpsModule siteTreeCollapsed={siteTreeCollapsed} onShowWorkspace={onShowWorkspace} />
    </section>
  );
}
