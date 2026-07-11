# itops.sites.emptyServerRoomsHint

- **English value**: `This Site has no Server Rooms. <addServerRoom>Create a new Server Room</addServerRoom>.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/SitesTab.tsx`
- **UI role**: `hint with action link`
- **User flow**: Shown in Site View when the Site contains no Server Rooms; the linked phrase opens the New Server Room dialog.
- **Tone**: direct setup guidance
- **Placeholders**: `<addServerRoom>…</addServerRoom>` is an i18next Trans component marker and must survive unchanged.
- **Context/meaning**: Server Room is the durable topology container below a Site.
- **Domain notes**: Preserve capitalized Site and Server Room domain terms.

<!-- Delete after every locale is intentionally verified. -->
