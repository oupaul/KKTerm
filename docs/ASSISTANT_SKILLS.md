# Assistant Skills

KKTerm ships local Assistant Skills as `SKILL.md` folders under `assistant-skills/`.
They are lightweight workflow guides for the in-app AI Assistant.

## Runtime model

- Packaged skills are bundled as Tauri resources.
- On first skill list or invocation, KKTerm copies missing bundled skill folders into the user app-data folder: `assistant-skills/`.
- Existing user skill folders are not overwritten, so users can edit or replace bundled starter skills.
- Settings -> AI Assistant -> Assistant Skills lists the app-data folder contents.
- Users can open the skills folder, open one skill folder directly, refresh the list, and enable or disable each valid skill.
- The AI Assistant sees enabled skill metadata in the system prompt, decides whether a skill is relevant, and invokes `assistant_use_skill` to load the full `SKILL.md` instructions on demand.
- When a skill is actually loaded, the assistant message work panel shows green `ai.skillInvoked` status text.
- v1 loads instruction text only. `scripts/`, `references/`, and other skill resources are not executed or loaded automatically.
- There is no keyword trigger matcher in the app. Selection is model-driven through the skill invocation tool.

## Skill format

Each skill folder must be named exactly like the `name` field and contain `SKILL.md`:

```markdown
---
name: ssh-troubleshooter
description: Diagnose SSH Connection failures, tmux resume problems, host key warnings, authentication errors, ProxyJump issues, and SFTP-over-SSH startup problems in KKTerm.
---

# SSH Troubleshooter

Use this skill when...
```

Validation rules:

- `name`: lowercase ASCII letters, digits, and hyphens, 1-64 characters.
- `description`: non-empty, at most 1024 characters, no angle brackets.
- Folder name must match `name`.
- Body must contain non-empty instructions.
- Instructions are truncated to 16,000 characters before prompt injection.

## Bundled starter skills

- `dashboard-widget-builder`: Dashboard AI Created Widget creation, repair, layout, data, secrets, and visual polish.
- `dashboard-widget-designer`: Dashboard AI Created Widget visual design, hierarchy, polish, states, and redesign critique.
- `dashboard-data-visualization`: Dashboard metrics, charts, health states, trends, timelines, logs, and data integrity.
- `desktop-accessibility-ui`: Accessible desktop UI and widget review for readability, focus, contrast, motion, and non-color status cues.
- `dns-dhcp-troubleshooter`: DNS lookup, split DNS, stale cache, DHCP lease, gateway, and resolver diagnosis.
- `firewall-port-troubleshooter`: Firewall, NAT, listener, blocked port, and service binding diagnosis.
- `network-connectivity-troubleshooter`: General reachability, routing, gateway, VPN, proxy, packet loss, latency, and MTU diagnosis.
- `remote-desktop-helper`: RDP/VNC setup, screenshots, input, focus, sizing, and troubleshooting.
- `sftp-transfer-helper`: SFTP browsing, upload/download planning, conflicts, permissions, and paths.
- `ssh-troubleshooter`: SSH Connection, authentication, host key, ProxyJump, tmux, and SFTP startup diagnosis.
- `terminal-command-planner`: Safe terminal command planning for local shells, SSH, PowerShell, Command Prompt, WSL, and diagnostics.
- `tls-certificate-troubleshooter`: TLS, HTTPS certificate, hostname mismatch, chain, trust root, SNI, and WebView2 URL Connection diagnosis.

## Adding bundled skills

1. Add `assistant-skills/<skill-name>/SKILL.md`.
2. Add the file to `src-tauri/tauri.conf.json` under `bundle.resources`.
3. Run `cargo test --manifest-path src-tauri/Cargo.toml assistant_skills --lib`.
4. Update `docs/manual/13-ai-assistant.md` and `docs/manual/15-settings.md` when user-facing behavior changes.
