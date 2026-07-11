# itops.automations.emptyHint

- **English value**: `No Automations yet. <newAutomation>Create a new Automation</newAutomation> for this Site.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/AutomationsTab.tsx`
- **UI role**: `hint with action link`
- **User flow**: Shown on the Automations destination when the selected Site has no Automations; the linked phrase opens the Automation editor.
- **Tone**: direct setup guidance
- **Placeholders**: `<newAutomation>…</newAutomation>` is an i18next Trans component marker and must survive unchanged.
- **Context/meaning**: Automation is a durable trigger, optional condition, and ordered action rule.
- **Domain notes**: Preserve capitalized Automation and Site domain terms.

<!-- Delete after every locale is intentionally verified. -->
