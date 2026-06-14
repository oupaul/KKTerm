# ADR 0003: Security and Privacy

## Status

Accepted

## Context

KKTerm handles sensitive hostnames, usernames, SSH keys, passwords, passphrases, terminal commands, terminal output, and AI API keys. User trust is central to the product. The app is personal/local for v0.1, with no team vault or cloud sync.

## Decision

KKTerm v0.1 will be local-first and privacy-first.

Storage decisions:

- Store non-secret data in SQLite.
- Store passwords, SSH passphrases, and AI API keys in the configured secret
  backend: OS keychain where available, and a password-encrypted local file on
  Linux until native or external password-manager backends are added.
- Reference SSH key files by path.
- Do not store private keys directly in KKTerm v0.1.
- Do not store plaintext secrets in config or SQLite.

AI decisions:

- AI command assist and app tool use are permission-bounded.
- Prompt mode is the default for AI Assistant tool permissions. Mutating tools return a permission-required result instead of executing automatically.
- Allow All mode is an explicit user setting that lets enabled assistant tools execute without per-operation prompting.
- Commands proposed by AI require explicit user approval before execution unless the user has explicitly enabled an automatic tool path for that class of operation.
- Destructive or credential-touching commands should receive extra confirmation where detectable.
- Assistant tools must preserve domain boundaries: saved Connection tools operate on durable SQLite Connection data, while live Session tools operate only on currently open runtime surfaces such as terminal Panes, RDP/VNC Sessions, and SFTP/FTP browser Sessions.
- Assistant context surfaces must be compact projections rather than raw state dumps. Passive page context should prefer ids, labels, summaries, counts, and small metadata. Full source code, full schemas, terminal buffers, screenshots, file contents, data URLs, and other large or sensitive payloads require an explicit user attachment or a narrow read tool. Dashboard AI Created Widget source is available through a single-widget source-read tool, not through always-on page context or successful create/update tool results.
- OpenAI-compatible API keys are bring-your-own and stored in the configured
  secret backend.
- Claude Code CLI and Codex CLI integrations should be constrained to suggest-only/ask-before-execute where possible.

Telemetry decisions:

- No telemetry by default.
- No automatic crash upload in v0.1.
- Local structured logs only.
- Terminal contents are not logged by default.
- Full AI Assistant debug logs are local diagnostic artifacts. Debug builds may write them automatically; release builds write them only when the user enables Advanced Debugging in Settings. These logs are sensitive and may include prompts, attachments, tool payloads, and generated widget source.
- Provide a diagnostics bundle command with redaction rules.

Licensing decisions:

- KKTerm app/core uses MIT.
- Prefer dependencies compatible with MIT/Apache-2.0/BSD/MPL-style use.
- Avoid GPL dependencies in the core runtime unless explicitly revisited.

## Consequences

The app avoids early cloud/data liability and gives users a clear local trust model. Some convenience features, such as sync, team vaults, and managed AI, are deferred until their security model can be designed deliberately.
