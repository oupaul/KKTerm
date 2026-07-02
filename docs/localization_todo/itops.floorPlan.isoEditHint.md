# itops.floorPlan.isoEditHint

- **English value**: `Drag cabinets onto floor tiles to arrange the room. Click an empty tile to add a rack.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomIsoView.tsx`
- **UI role**: `status`
- **User flow**: Helper line shown under the 2.5D Server Room View while edit mode is active, explaining drag-to-place and click-to-add on the floor grid.
- **Tone**: direct setup guidance, two short sentences
- **Placeholders**: none
- **Context/meaning**: "Cabinets" are the extruded Rack cuboids standing on the floor; "tiles" are the floor grid cells. "Add a rack" opens the existing New Rack dialog.
- **Domain notes**: Follow each locale's existing terminology for Rack (`itops.racks.addRack`) and Server Room. Best-effort translations were added to all 13 non-English locales in the same change; this file is the review record.

<!--
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
