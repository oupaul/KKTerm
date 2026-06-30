# dashboard.pcInfoLabel.freeOfTotal

- **English value**: `{{free}} free · {{total}}`
- **Namespace**: `dashboard`
- **File/component**: `src/modules/dashboard/widgets/builtin/pc-info/PcInfoWidget.tsx`
- **UI role**: `fragment`
- **User flow**: User opens the PC Info widget on the Dashboard and views this in the relevant section/tab.
- **Tone**: concise/neutral
- **Placeholders**: {{free}} = formatted free bytes, {{total}} = formatted total bytes; both must survive unchanged
- **Context/meaning**: Sub-caption under a storage volume donut showing free space out of total (middle dot separator).
- **Domain notes**: PC Info is a Dashboard built-in widget. Live CPU/RAM/network values come from the status-bar host-usage monitor (no separate pipe). Acronyms CPU/GPU/OS/RAM/GHz/GB and the middle-dot separator ' · ' typically stay as-is.

<!--
Filename: dashboard.pcInfoLabel.freeOfTotal.md
Best-effort translations were added to every locale; this file remains as the review record. Delete once translations are reviewed/finalized.
-->
