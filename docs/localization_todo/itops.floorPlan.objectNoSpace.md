# itops.floorPlan.objectNoSpace

- **English value**: `No free vertical space in that spot.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/SitesTab.tsx`
- **UI role**: `status`
- **User flow**: Status Bar warning when placing or moving a room object into a floor cell whose vertical span is fully occupied.
- **Tone**: concise/neutral UI label
- **Placeholders**: none
- **Context/meaning**: Cells stack occupants vertically (e.g. a snack pack on a rack top); this fires when nothing fits below the ceiling.
- **Domain notes**: Server Room View floor plan / 2.5D room. "Rack" and rack unit "U" follow the existing itops glossary; best-effort translations for all 14 locales were added in the same change and need review.
