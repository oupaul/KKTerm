# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

### settings.sshKeyEmailDialogTitle

- English value: "Generate SSH key"
- Namespace: `settings`
- File/component: `src/settings/SshSettings.tsx` / `SshKeyEmailDialog`
- UI role: dialog title
- Surrounding user flow: Settings -> SSH -> Generate key opens an app-owned popup asking for the email comment before creating the SSH key pair.
- Tone: concise action title.
- Placeholder details: none.
- Domain notes: SSH stays English as a technical protocol name.

### settings.sshKeyEmailDialogHint

- English value: "Add an email address as the public key comment so the key is easy to recognize later."
- Namespace: `settings`
- File/component: `src/settings/SshSettings.tsx` / `SshKeyEmailDialog`
- UI role: helper text
- Surrounding user flow: Shown inside the SSH key generation popup above the email field.
- Tone: practical, reassuring explanation.
- Placeholder details: none.
- Domain notes: Public key comment is metadata added to the generated SSH public key, not a credential or account email requirement.

### settings.sshKeyEmailPlaceholder

- English value: "admin@example.com"
- Namespace: `settings`
- File/component: `src/settings/SshSettings.tsx` / `SshKeyEmailDialog`
- UI role: input placeholder
- Surrounding user flow: Example value in the email field for SSH key generation.
- Tone: neutral example.
- Placeholder details: literal example email address; keep the `example.com` domain.
- Domain notes: This is only an SSH key comment example.

### settings.sshKeyGenerating

- English value: "Generating..."
- Namespace: `settings`
- File/component: `src/settings/SshSettings.tsx` / `SshKeyEmailDialog`
- UI role: button loading state
- Surrounding user flow: Replaces the Generate key submit label while AdminDeck creates the SSH key pair.
- Tone: brief progress status.
- Placeholder details: none.
- Domain notes: Refers to SSH key pair creation.
