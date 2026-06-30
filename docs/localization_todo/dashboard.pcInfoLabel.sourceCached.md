# dashboard.pcInfoLabel.sourceCached

- **English value**: `Source: {{source}} · snapshot cached`
- **Namespace**: `dashboard`
- **File/component**: `src/modules/dashboard/widgets/builtin/pc-info/PcInfoWidget.tsx`
- **UI role**: `status`
- **User flow**: User opens the PC Info widget on the Dashboard and views this in the relevant section/tab.
- **Tone**: concise/neutral
- **Placeholders**: {{source}} = collector id such as windows-cim; must survive unchanged
- **Context/meaning**: Footer note naming which collector produced the snapshot and that it is cached until Refresh.
- **Domain notes**: PC Info is a Dashboard built-in widget. Live CPU/RAM/network values come from the status-bar host-usage monitor (no separate pipe). Acronyms CPU/GPU/OS/RAM/GHz/GB and the middle-dot separator ' · ' typically stay as-is.

<!--
Filename: dashboard.pcInfoLabel.sourceCached.md
Best-effort translations were added to every locale; this file remains as the review record. Delete once translations are reviewed/finalized.
-->
