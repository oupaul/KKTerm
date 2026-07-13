# itops.racks.sequenceAction

- **English value**: `Sequence`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/RackDialog.tsx`
- **UI role**: `button`
- **User flow**: Shown above the Rack name input when a Rack is being configured from the Server Room object picker. It inserts `%02d` at the current input selection to enable incrementing placement names.
- **Tone**: `concise/neutral`
- **Placeholders**: `none` (`%02d` is a literal Java-style numeric format token inserted by the action, not an i18next placeholder)
- **Context/meaning**: `Sequence` means create an ordered run of incrementally numbered Rack names, not a media sequence, task workflow, or sort command.
- **Domain notes**: `Rack` is the durable cabinet in the Site → Server Room → Rack topology. Keep `%02d` unchanged wherever it is discussed.

<!--
Filename: itops.racks.sequenceAction.md
Delete this file once every non-English locale under src/i18n/locales/ has the key intentionally translated and verified.
-->
