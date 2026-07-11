# itops.racks.emptyServerRoomHint

- **English value**: `This Server Room has no Racks. <addRack>Create a new Rack</addRack>.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/SitesTab.tsx`
- **UI role**: `hint with action link`
- **User flow**: Shown in Server Room View when the selected Server Room contains no Racks; the linked phrase opens the New Rack dialog.
- **Tone**: direct setup guidance
- **Placeholders**: `<addRack>…</addRack>` is an i18next Trans component marker and must survive unchanged.
- **Context/meaning**: Rack means the durable IT Ops virtual equipment cabinet; Server Room is its parent topology container.
- **Domain notes**: Preserve capitalized Server Room and Rack domain terms.

<!-- Delete after every locale is intentionally verified. -->
