# itops.hosts.empty

- **English value**: `No Hosts yet. <importHosts>Import Hosts</importHosts> to build this Site's inventory.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/HostsPanel.tsx`
- **UI role**: `hint with action link`
- **User flow**: Shown on the Hosts destination when the selected Site contains no Hosts; the linked phrase opens Host import.
- **Tone**: direct setup guidance
- **Placeholders**: `<importHosts>…</importHosts>` is an i18next Trans component marker and must survive unchanged.
- **Context/meaning**: Host means a durable IT Ops inventory entry, not a Connection or live Session.
- **Domain notes**: Preserve capitalized Host and Site domain terms.

<!-- Delete after every locale is intentionally verified. -->
