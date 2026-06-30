# itops.racks.empty

- **English value**: `No racks yet. Arrange this Site's hosts into a virtual datacenter.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/` (Site topology + Batch Run UI)
- **UI role**: `fragment`
- **User flow**: Shown in the IT Ops Module after the Fleet→Site rename; user sees it while browsing Sites, editing a Site, or launching a Batch Run.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Site" is the top-level IT Ops container (Site → Server Room → Rack), the renamed former "Fleet"/"Host Group". It is a named selection of Connections used as a Batch Run / Automation target, not a generic website. Non-English locales still carry the previous term and must be retranslated.
- **Domain notes**: zh-TW must use a Taiwan term for "site" (e.g. 站台/據點) and never the Mainland 站点; translate each locale independently (no zh-CN→zh-TW bleed). Server Room, Rack, Batch Run, Automation, Connection keep their established KKTerm translations.

<!--
Filename: itops.racks.empty.md
Delete this file once every non-English locale under src/i18n/locales/ has the key retranslated to the Site term.
-->
