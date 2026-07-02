# itops.floorPlan.powerDrawOnly

- **English value**: `{{watts}} W`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/ServerRoomFloorPlan.tsx`
- **UI role**: `status`
- **User flow**: Value line on a rack tile / 2.5D detail card in the power metric when the rack has no capacity configured: total draw only.
- **Tone**: concise/neutral
- **Placeholders**: {{watts}} — number in watts; keep the SI unit symbol W
- **Context/meaning**: Unit string; most locales keep it unchanged.
- **Domain notes**: Best-effort translations were added to all 13 non-English locales in the same change; this file is the review record. Follow each locale's existing `itops.racks.*` terminology for Rack/Server Room.

<!--
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
