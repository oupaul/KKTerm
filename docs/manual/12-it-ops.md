# 12 — IT Ops

## AI grep hints

- Keys: `itops.*`, `settings.sectionItOps`, `watchdog.*`
- Topics: IT Ops Module, Fleets, Fleet View, Server Room, Server Room View, Rack View, racks, Rack Device, Rack Device Type, Rack Device Properties, rack unit (U), rack shell, tree navigator, drill-down, virtual datacenter, click-to-connect, Batch Runs, Automations, fleet task, run history, Run Report, transport, SSH, WinRM, PsExec, trigger, condition, action, armed, disabled, Watchdog Status Bar
- Tutorial targets: `app.activityRailItOps`, `itops.fleetsTree`, `itops.fleetView`
- Synonyms: "run on many hosts", "bulk command", "fleet", "host group" (renamed to Fleet), "host collection", "rack diagram", "rack elevation", "virtual datacenter", "data center map", "open from rack", "scheduled monitor", "saved watchdog", "automation rule", "batch script", "run report"

The **IT Ops Module** is an Activity Rail destination for operating across multiple existing Connections. Its current visible surface is Fleets: a left Fleets navigator and a right Fleet topology drill-down. Batch Runs and Automations remain part of IT Ops functionality, but their top-level management chrome is hidden in the current UI. Settings → General → `settings.activityRail` controls whether the Module appears; it is hidden by default.

## Fleets

A **Fleet** is a durable named selection of existing Connections and the top-level container for Server Rooms and Racks. It references Connections but is not itself a Connection and owns no live Session or secret. When IT Ops has no Fleet data, KKTerm keeps an undeletable Default Fleet so the topology always has a safe parent container.

Open Fleets from the left navigator's add menu and choose `itops.racks.addFleet`. The New Fleet dialog explains that a Fleet can model a region, location, customer, project, or other infrastructure grouping. Enter `itops.fleets.nameLabel`, select Connections, and choose the per-Fleet transport default. The header's shared icon picker customizes the Fleet icon; the `connections.iconForeground` palette appears inside that picker only for recolorable Lucide glyphs, while the `connections.iconBackground` palette stays in the header. Clearing the foreground restores automatic light/dark contrast against the selected background. `itops.transport.auto` derives transport from each Connection; explicit SSH, WinRM, and PsExec choices override it. Save with `itops.actions.create`. Editing membership does not modify or delete the referenced Connections.

The left Fleets column includes the `itops.title` label/icon and can be resized like the Connection Tree. Use the Fleets title-bar button, placed immediately before the `app.aiAssistant` button, to hide or show the entire left Fleets navigator. The right column shows the selected Fleet's topology only; it does not show the old Fleets / Batch Runs / Automations top bar.

### Fleet View, Server Room View, and Rack View

The Fleet topology is a Connection-tree-style navigator. The left panel nests **Fleet → Server Room → Rack** as collapsible, searchable (`itops.racks.treeSearchPlaceholder`) rows. Clicking a **Fleet** opens **Fleet View**, a card grid of its **Server Rooms**. Clicking a **Server Room** opens **Server Room View**, showing its racks grouped under their `itops.racks.groupLabel` tag (`itops.racks.ungrouped` for untagged racks). Clicking a **Rack** opens **Rack View**, centered on a stage with per-device "balloon" callouts pointing to each U slot. A breadcrumb climbs back up. Blank server rooms group under `itops.racks.unassigned`. Choose `itops.racks.addServerRoom` to create a Server Room in a selected Fleet; because Server Rooms are stored through racks, the dialog also asks for `itops.racks.firstRackLabel`. The Server Room header reuses the Fleet icon picker, with the foreground palette shown inside the picker for recolorable Lucide glyphs and the background palette in the header, including automatic contrast when no foreground override is selected. Choose `itops.racks.addRack` to add a Rack with `itops.racks.fleetLabel` and `itops.racks.serverRoomSelectLabel` preselected from the highlighted tree item. A rack cabinet and each Rack Device can use a `itops.racks.shellLabel` finish — `itops.racks.shell.black`, `itops.racks.shell.white`, or `itops.racks.shell.grey`.

Each Rack is drawn as an animated metal elevation: rail caps, a U-number gutter, and every device painted as its own faceplate that animates to match its kind and status (server fan spin and drive-bay LEDs, switch/router port blink, firewall throughput bars, disk-array grid, PDU load meter, UPS battery cells, KVM channels, patch-panel ports, blanking plate). The Rack header shows online / warning / offline tallies, and devices slide in on load.

Click an empty U slot to add a **Rack Device** (`itops.racks.addItemTitle`): either a placed Fleet Connection or a passive device. The **Rack Device Type** (`itops.racks.kindLabel`) choice covers `itops.racks.kind.server`, `itops.racks.kind.storage`, `itops.racks.kind.switch`, `itops.racks.kind.router`, `itops.racks.kind.firewall`, `itops.racks.kind.pdu`, `itops.racks.kind.ups`, `itops.racks.kind.kvm`, `itops.racks.kind.patchPanel`, `itops.racks.kind.equipment`, `itops.racks.kind.general`, `itops.racks.kind.kuaiguai`, `itops.racks.kind.blank`, and `itops.racks.kind.label`. **Rack Device Properties** are non-secret presentation fields: `itops.racks.statusLabel` (`itops.racks.status.online` / `itops.racks.status.warning` / `itops.racks.status.offline`), faceplate specs where the type shows them (`itops.racks.portsLabel`, `itops.racks.disksLabel`, `itops.racks.batteryLabel`, `itops.racks.loadLabel`), notes, tags, structured rack-audit records, additional Connection bindings selected from Fleet members, typed network-port speed rows, SNMP target/OID fields with user-triggered manual refresh, hardware-shell preview vendor, typed relationship badges for Host/VM, storage/AP, VSAN, SAN, NAS, and hyper-converged models, IPAM address inventory with family/role/VLAN/MAC, accent/icon, plus position and height. The `itops.racks.kind.kuaiguai` type adds expiry, package size, package rotation, and yaw fields and renders a green 乖乖 package with KK artwork on the rack faceplate. Placements that overlap an existing device or fall outside the Rack report an error in the Status Bar and are not saved; shrinking a Rack below a placed device is likewise rejected.

A placed host **opens its Session on click** (ssh/RDP/VNC/etc., via the same path as the Connection Tree); a hover pencil edits it. Passive items open the edit dialog. A placed Connection that no longer resolves to a Fleet member is shown dimmed with a `itops.racks.ghostBadge` badge — it cannot be opened but can still be edited or removed. Placement is a visual arrangement only; it does not modify the referenced Connections. The notes and additional bindings are inventory metadata that can support random rack/server-room callouts and multi-Connection device lookup without creating live Session state.

## Batch Runs

A **Batch Run** sends one script to every resolved host in a selected Fleet. When the Batch Run launcher is opened by IT Ops runtime actions, select `itops.batchRuns.fleetLabel`, enter the script under `itops.batchRuns.scriptLabel`, and choose `itops.actions.run`.

Execution fans out with bounded concurrency. The live view shows queued, running, successful, and failed hosts and streams each host's combined output. `itops.actions.cancel` stops an active run. A completed run is written to Recent runs; select an entry to open its read-only Run Report and inspect the saved per-host output. `itops.actions.rerun` opens a new launcher preselected to the same Fleet.

The script is state-changing operator input. Review it and the target Fleet before starting. Authentication secrets remain in the OS keychain and are not copied into the Fleet or report.

## Automations

An **Automation** is a durable trigger → optional condition → ordered actions rule. Its saved definition persists and enabled rules re-arm when KKTerm launches; the live **Watchdog** runtime performs sampling and execution in memory.

When the Automation editor is opened by IT Ops runtime actions, name the rule, configure its trigger and condition, then add typed actions with `itops.actions.addAction`. Available actions include notify, popup, email, webhook, and running a Batch Run. The editor's Test action samples/evaluates the rule and previews actions without sending email, calling a webhook, or starting a Batch Run. Save with `itops.actions.create` or `itops.actions.save`.

The Automations list shows `itops.automations.armed` or `itops.automations.disabled`. Use its toggle to arm or disarm a rule, or use the edit and delete actions. Triggered in-app notifications use the Status Bar; popup actions use an app-owned dialog. The Watchdog Status Bar indicator provides app-wide live runtime visibility.

## AI Assistant

The shared AI Assistant receives compact IT Ops page context: Fleet names/member counts/transports, loaded rack-topology counts, Automation names and armed state, recent-run count, and a live-run summary. It does not receive scripts, host output, secrets, Rack Device details, or full trigger/action bodies through page context. Ask it operational questions normally; for UI guidance it searches this chapter and can navigate to the IT Ops Module or highlight one of the tutorial targets above after you ask to be shown.
