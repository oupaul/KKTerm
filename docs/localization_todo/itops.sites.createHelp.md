# itops.sites.createHelp

- **English value**: `A Site is the top-level container for Server Rooms, Racks, and Connections. Use one for a region, location, customer, project, or any other way you organize infrastructure.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/` (Site topology + Batch Run UI)
- **UI role**: `tooltip`
- **User flow**: Shown in the IT Ops Module after the Fleet→Site rename; user sees it while browsing Sites, editing a Site, or launching a Batch Run.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Site" is the top-level IT Ops container (Site → Server Room → Rack), the renamed former "Fleet"/"Host Group". It is a named selection of Connections used as a Batch Run / Automation target, not a generic website. Non-English locales still carry the previous term and must be retranslated.
- **Domain notes**: zh-TW must use a Taiwan term for "site" (e.g. 站台/據點) and never the Mainland 站点; translate each locale independently (no zh-CN→zh-TW bleed). Server Room, Rack, Batch Run, Automation, Connection keep their established KKTerm translations.

<!--
Filename: itops.sites.createHelp.md
Delete this file once every non-English locale under src/i18n/locales/ has the key retranslated to the Site term.
-->
