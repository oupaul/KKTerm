# dashboard.notesFontOption.system

- **English value**: `System`
- **Namespace**: `dashboard`
- **File/component**: `src/dashboard/widgets/NotesBody.tsx`
- **UI role**: label (option text inside the font `<select>`)
- **User flow**: Shown as an option when the user opens the font dropdown on a Notes widget. Selecting this renders the note in the app's default UI font instead of a decorative one.
- **Tone**: concise/neutral, one short noun
- **Placeholders**: none
- **Domain notes**: Refers to the host OS / app default UI font (`var(--font, system-ui)`). Use the locale's standard term for "system font" — not "default" by itself, since "default" already maps to a different KKTerm accent token elsewhere.
