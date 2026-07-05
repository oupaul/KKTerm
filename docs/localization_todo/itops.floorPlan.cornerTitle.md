# itops.floorPlan.cornerTitle

- **English value**: `Next corner`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomFloorPlan.tsx`, `src/modules/itops/ServerRoomIsoView.tsx`
- **UI role**: `tooltip`
- **User flow**: In Server Room View edit mode, a selected quarter-block room object (camera, fire extinguisher, sensor, smoke detector, 乖乖 pack) shows this control next to Rotate; clicking it walks the object to the next corner (quadrant) of its floor cell.
- **Tone**: concise/neutral, matches the sibling controls "Rotate" / "Raise" / "Lower"
- **Placeholders**: none
- **Context/meaning**: "Corner" = one of the four quadrants of a floor grid cell (NW/NE/SE/SW) that a small fixture occupies, not the corner of the room. The button advances to the next corner clockwise.
- **Domain notes**: Best-effort translations were added to every locale in the same change; review against each locale's existing floor-plan control terms.

<!--
Filename: itops.floorPlan.cornerTitle.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
