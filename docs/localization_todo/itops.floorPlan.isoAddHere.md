# itops.floorPlan.isoAddHere

- **English value**: `Add a rack on this tile`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomIsoView.tsx`
- **UI role**: `tooltip`
- **User flow**: Tooltip/aria title of an empty floor tile in the 2.5D Server Room View while edit mode is active; clicking the tile opens the New Rack dialog.
- **Tone**: concise action label
- **Placeholders**: none
- **Context/meaning**: "Tile" is one cell of the room's floor grid, not a UI card. "Add" creates a new Rack via the existing dialog.
- **Domain notes**: Use each locale's existing Rack terminology from `itops.racks.*`. Best-effort translations were added to all 13 non-English locales in the same change; this file is the review record.

<!--
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
