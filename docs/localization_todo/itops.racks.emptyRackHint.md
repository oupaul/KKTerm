# itops.racks.emptyRackHint

- **English value**: `Rack is empty, enable <editMode>Edit mode</editMode> to add devices.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/SitesTab.tsx`
- **UI role**: `hint with action link`
- **User flow**: Shown beneath an empty Rack in Rack View; the linked phrase turns on Edit mode so the Rack Device picker becomes available.
- **Tone**: direct setup guidance
- **Placeholders**: `<editMode>…</editMode>` is an i18next Trans component marker and must survive unchanged.
- **Context/meaning**: Edit mode is the IT Ops placement-editing state, not editing Rack properties.
- **Domain notes**: Rack Device placement remains available only through the Edit-mode picker.

<!-- Delete after every locale is intentionally verified. -->
