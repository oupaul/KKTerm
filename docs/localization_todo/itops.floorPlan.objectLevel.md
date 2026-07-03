# itops.floorPlan.objectLevel

- **English value**: `Bottom at {{z}}U`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomFloorPlan.tsx`
- **UI role**: `tooltip`
- **User flow**: Part of a placed room object's tooltip stating the height of the object's bottom edge above the floor.
- **Tone**: concise/neutral UI label
- **Placeholders**: `{{z}}` — a number of rack units; must survive unchanged in every locale
- **Context/meaning**: U = rack unit; {{z}} is a number of rack units. Keep the {{z}} placeholder and the U unit.
- **Domain notes**: Server Room View floor plan / 2.5D room. "Rack" and rack unit "U" follow the existing itops glossary; best-effort translations for all 14 locales were added in the same change and need review.
