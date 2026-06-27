# 12 — IT Ops

## AI grep hints

- Keys: `itops.*`, `settings.sectionItOps`, `watchdog.*`
- Topics: IT Ops Module, Fleets, Rack View, racks, rack unit (U), region, area, virtual datacenter, click-to-connect, Batch Runs, Automations, fleet task, run history, Run Report, transport, SSH, WinRM, PsExec, trigger, condition, action, armed, disabled, Watchdog Status Bar
- Tutorial targets: `app.activityRailItOps`, `itops.tabs`, `itops.groups`, `itops.runs`, `itops.autos`, `itops.primaryAction`
- Synonyms: "run on many hosts", "bulk command", "fleet", "host group" (renamed to Fleet), "host collection", "rack diagram", "rack elevation", "virtual datacenter", "data center map", "open from rack", "scheduled monitor", "saved watchdog", "automation rule", "batch script", "run report"

The **IT Ops Module** is an Activity Rail destination for operating across multiple existing Connections. It has three tabs: Fleets (`itops.tabs.fleets`), Batch Runs (`itops.tabs.runs`), and Automations (`itops.tabs.autos`). Settings → General → `settings.activityRail` controls whether the Module appears; it is hidden by default.

## Fleets

A **Fleet** is a durable named selection of existing Connections. It references Connections but is not itself a Connection and owns no live Session or secret.

Open Fleets and choose `itops.actions.newFleet`. Enter `itops.fleets.nameLabel`, select Connections, and choose the per-Fleet transport default. `itops.transport.auto` derives transport from each Connection; explicit SSH, WinRM, and PsExec choices override it. Save with `itops.actions.create`. Editing membership does not modify or delete the referenced Connections.

The Fleet detail view can edit or delete the Fleet, add Connections, change transport, and start a Batch Run with `itops.actions.runTask`. Deleting a Fleet leaves its Connections untouched and does not erase completed run history.

### Rack View

The Fleet detail has a `itops.fleets.viewMembers` / `itops.fleets.viewRacks` toggle. **Rack View** renders the Fleet as a virtual datacenter: **Racks** grouped by region and area, each drawn as a front elevation measured in rack units (U). Choose `itops.racks.newTitle` to add a Rack (`itops.racks.nameLabel`, `itops.racks.regionLabel`, `itops.racks.areaLabel`, `itops.racks.heightLabel`).

Each Rack is drawn as an animated metal elevation: rail caps, a U-number gutter, and every device painted as its own faceplate that animates to match its kind and status (server fan spin and drive-bay LEDs, switch/router port blink, firewall throughput bars, disk-array grid, PDU load meter, UPS battery cells, KVM channels, patch-panel ports, blanking plate). The Rack header shows online / warning / offline tallies, and devices slide in on load.

Click an empty U slot to add a device (`itops.racks.addItemTitle`): either a placed Fleet Connection or a passive device. The `itops.racks.kindLabel` choice covers `itops.racks.kind.server`, `itops.racks.kind.storage`, `itops.racks.kind.switch`, `itops.racks.kind.router`, `itops.racks.kind.firewall`, `itops.racks.kind.pdu`, `itops.racks.kind.ups`, `itops.racks.kind.kvm`, `itops.racks.kind.patchPanel`, `itops.racks.kind.equipment`, `itops.racks.kind.general`, `itops.racks.kind.blank`, and `itops.racks.kind.label`. Set the device `itops.racks.statusLabel` (`itops.racks.status.online` / `itops.racks.status.warning` / `itops.racks.status.offline`) and, where the kind shows them, faceplate specs — `itops.racks.portsLabel`, `itops.racks.disksLabel`, `itops.racks.batteryLabel`, `itops.racks.loadLabel` — along with position and height. Placements that overlap an existing device or fall outside the Rack report an error in the Status Bar and are not saved; shrinking a Rack below a placed device is likewise rejected.

A placed host **opens its Session on click** (ssh/RDP/VNC/etc., via the same path as the Connection Tree); a hover pencil edits it. Passive items open the edit dialog. A placed Connection that no longer resolves to a Fleet member is shown dimmed with a `itops.racks.ghostBadge` badge — it cannot be opened but can still be edited or removed. Placement is a visual arrangement only; it does not modify the referenced Connections.

## Batch Runs

A **Batch Run** sends one script to every resolved host in a selected Fleet. Choose `itops.actions.newBatchRun`, select `itops.batchRuns.fleetLabel`, enter the script under `itops.batchRuns.scriptLabel`, and choose `itops.actions.run`.

Execution fans out with bounded concurrency. The live view shows queued, running, successful, and failed hosts and streams each host's combined output. `itops.actions.cancel` stops an active run. A completed run is written to Recent runs; select an entry to open its read-only Run Report and inspect the saved per-host output. `itops.actions.rerun` opens a new launcher preselected to the same Fleet.

The script is state-changing operator input. Review it and the target Fleet before starting. Authentication secrets remain in the OS keychain and are not copied into the Fleet or report.

## Automations

An **Automation** is a durable trigger → optional condition → ordered actions rule. Its saved definition persists and enabled rules re-arm when KKTerm launches; the live **Watchdog** runtime performs sampling and execution in memory.

Choose `itops.actions.newAutomation`, name the rule, configure its trigger and condition, then add typed actions with `itops.actions.addAction`. Available actions include notify, popup, email, webhook, and running a Batch Run. The editor's Test action samples/evaluates the rule and previews actions without sending email, calling a webhook, or starting a Batch Run. Save with `itops.actions.create` or `itops.actions.save`.

The Automations list shows `itops.automations.armed` or `itops.automations.disabled`. Use its toggle to arm or disarm a rule, or use the edit and delete actions. Triggered in-app notifications use the Status Bar; popup actions use an app-owned dialog. The Watchdog Status Bar indicator provides app-wide live runtime visibility.

## AI Assistant

The shared AI Assistant receives compact IT Ops page context: Fleet names/member counts/transports, Automation names and armed state, recent-run count, and a live-run summary. It does not receive scripts, host output, secrets, or full trigger/action bodies through page context. Ask it operational questions normally; for UI guidance it searches this chapter and can navigate to the IT Ops Module or highlight one of the tutorial targets above after you ask to be shown.
