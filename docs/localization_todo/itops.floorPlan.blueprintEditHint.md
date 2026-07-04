# itops.floorPlan.blueprintEditHint

- **English value**: `Drag racks and objects between floor cells. Pick a card in the object picker and click a cell to place it; the rotate control turns a rack's front.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomFloorPlan.tsx`
- **UI role**: `status`
- **User flow**: Hint line under the blueprint floor plan while edit mode is on. CHANGED: the edit-mode palette row became the object picker column.
- **Tone**: concise/neutral UI label
- **Placeholders**: none
- **Context/meaning**: "Object picker" = the edit-mode right-side column of placeable cards (itops.floorPlan.pickerTitle); "front" = the side of the rack the doors/devices face; the rotate control cycles it in quarter turns.
- **Domain notes**: Server Room View floor plan / 2.5D room. "Rack" and rack unit "U" follow the existing itops glossary; best-effort translations for all 14 locales were added in the same change and need review.
