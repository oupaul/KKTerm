# settings.portableOnboardingSecurity

- **English value**: `Passwords can be protected in the encrypted database. Connection names, hostnames, usernames, notes, and other non-secret data remain readable in the portable database.`
- **Namespace**: `settings`
- **File/component**: `src/app/PortableOnboardingDialog.tsx`
- **UI role**: `warning`
- **User flow**: Explains the portable database threat boundary before credential setup.
- **Tone**: honest safety guidance
- **Placeholders**: none
- **Context/meaning**: Only secrets are encrypted; non-secret SQLite content is plaintext.
- **Domain notes**: Connection is KKTerm's durable openable resource; database is SQLite.
