# itops.floorPlan.zoomSet

- **English value**: `Set zoom to {{percent}}%`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/roomViewParts.tsx`
- **UI role**: `tooltip`
- **User flow**: Tooltip/aria-label on each tick of the floating vertical zoom ruler over the Server Room floor plan and 2.5D views; clicking a tick jumps to that fixed level.
- **Tone**: concise/neutral UI label
- **Placeholders**: `{{percent}}` — the zoom percentage number (50–200); must survive unchanged in every locale.
- **Context/meaning**: "Zoom" = the room view's scale factor, same sense as itops.floorPlan.zoomLabel.
- **Domain notes**: Server Room View floor plan / 2.5D room; best-effort translations for all 14 locales were added in the same change and need review.
