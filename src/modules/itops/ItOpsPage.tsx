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
  fleetTreeCollapsed,
  onAssistantContextChange,
}: {
  active: boolean;
  fleetTreeCollapsed: boolean;
  onAssistantContextChange: (context: AssistantPageContext) => void;
}) {
  const { t } = useTranslation();
  const fleets = useItOpsStore((state) => state.fleets);
  const runHistory = useItOpsStore((state) => state.runHistory);
  const automations = useItOpsStore((state) => state.automations);
  const activeRun = useItOpsStore((state) => state.activeRun);
  const racksByFleet = useItOpsStore((state) => state.racksByFleet);

  useEffect(() => {
    // Compact rack-topology summary for whichever Fleets have had their Rack
    // View opened (racks load on demand); never device-level detail or secrets.
    const rackSummary = Object.entries(racksByFleet)
      .filter(([, racks]) => racks.length > 0)
      .map(([fleetId, racks]) => {
        const name = fleets.find((fleet) => fleet.id === fleetId)?.name ?? fleetId;
        const devices = racks.reduce((sum, rack) => sum + rack.items.length, 0);
        return `${name} [${racks.length} racks, ${devices} placed devices]`;
      })
      .join(", ");

    onAssistantContextChange({
      contextKind: "itops",
      contextLabel: t("itops.title"),
      connectionLabel: t("itops.title"),
      sourceLabel: `${t("itops.title")} context`,
      text: [
        "Active Module: IT Ops.",
        "Tutorial targets: itops.fleetsTree for the left Fleets navigator and itops.fleetView for the right Fleet topology drill-down.",
        `Fleets (${fleets.length}): ${fleets.map((group) => `${group.name} [${group.memberIds.length} saved members, ${group.transport}]`).join(", ") || "none"}.`,
        `Rack topology (loaded Fleets only): ${rackSummary || "none loaded"}.`,
        `Automations (${automations.length}): ${automations.map((automation) => `${automation.name} [${automation.enabled ? "armed" : "disabled"}]`).join(", ") || "none"}.`,
        `Recent completed Batch Runs: ${runHistory.length}.`,
        activeRun
          ? `Live Batch Run: ${activeRun.taskSummary} [${activeRun.state}], ${activeRun.hosts.length} hosts.`
          : "Live Batch Run: none.",
        "For operational instructions, search and read the IT Ops chapter in the KKTerm Operation Manual before answering. Do not infer host output, scripts, secrets, or trigger details from this compact metadata.",
      ].join("\n"),
    });
  }, [activeRun, automations, fleets, onAssistantContextChange, racksByFleet, runHistory, t]);

  return (
    <section
      className="itops-page"
      aria-label={t("itops.title")}
      data-active={active ? "true" : "false"}
    >
      <ItOpsModule fleetTreeCollapsed={fleetTreeCollapsed} />
    </section>
  );
}
