# KKTerm Promotion Kit

Purpose: help KKTerm reach at least 100 GitHub stars by making every public post
and outreach email consistent, accurate, and easy to send.

Primary link: https://github.com/ryantsai/KKTerm

Landing page: https://ryantsai.github.io/KKTerm/

Feedback thread: https://github.com/ryantsai/KKTerm/discussions/141

Launch announcement: https://github.com/ryantsai/KKTerm/discussions/146

Latest release: https://github.com/ryantsai/KKTerm/releases/tag/v0.1.34

Current proof points:

- Windows-first desktop admin workspace built with Rust, Tauri v2, React, and
  TypeScript.
- Local-first: SQLite for durable non-secret data, OS keychain for secrets, no
  telemetry.
- One workspace for local terminals, SSH, SFTP/FTP, URL Connections, RDP, VNC,
  Dashboard widgets, and approval-gated AI tools.
- SSH Panes can attach to named tmux Sessions for long-running coding agents.
- Built-in MCP server lets local coding agents inspect and drive KKTerm through
  curated tools.
- The Dashboard can host AI-created sandboxed widgets.

## Success Target

- Goal: 100 GitHub stars.
- Baseline on 2026-05-24: 7 stars.
- Remaining: 93 stars.
- Tracking source: `gh repo view ryantsai/KKTerm --json stargazerCount`.

## Repository Metadata

The GitHub repository should stay aligned with this positioning:

- Description: `Windows-first local admin workspace for terminals, SSH, SFTP, RDP/VNC, dashboards, and approval-gated AI tools`
- Topics: `tauri`, `rust`, `react`, `typescript`, `windows`, `terminal`, `ssh`,
  `sftp`, `rdp`, `vnc`, `sysadmin`, `devops`, `local-first`, `mcp`, `ai-tools`

## One-Line Pitch

KKTerm is a Windows-first, local-first admin workspace that puts terminals, SSH,
SFTP/FTP, RDP/VNC, URL Connections, dashboards, and approval-gated AI tools in
one native Tauri app.

## Short Post

I am building KKTerm, a Windows-first local admin workspace for people who live
between terminals, SSH, SFTP, RDP/VNC, router UIs, dashboards, and AI coding
agents.

It is Rust + Tauri v2 + React, stores durable data locally in SQLite, keeps
secrets in the OS keychain, and does not ship telemetry. The unusual bit: SSH
Panes can attach to named tmux Sessions for long-running coding agents, and the
Dashboard can host sandboxed AI-created widgets.

If you are a Windows sysadmin, DevOps engineer, MSP, homelab operator, or
terminal-heavy developer, feedback and stars both help:

https://github.com/ryantsai/KKTerm

## Hacker News / Lobsters Title Options

- Show HN: KKTerm, a Windows-first admin workspace for terminals, SSH, RDP/VNC, and AI tools
- KKTerm: local-first Windows admin workspace built with Rust, Tauri, and React
- I am building the Windows admin workspace I wanted for SSH, RDP/VNC, dashboards, and coding agents

## Reddit Post

Title:

`I am building a Windows-first local admin workspace for terminals, SSH, SFTP, RDP/VNC, and AI coding agents`

Body:

I am building KKTerm, an open-source Windows-first desktop app for admin and
terminal-heavy work.

The goal is to replace the daily pile of separate tools: terminal emulator,
SSH client, SFTP client, RDP window, VNC viewer, router web UI, scratch
dashboard, and the remote tmux session where Claude Code/Codex is running.

What is already in scope:

- Local terminals and SSH terminal Sessions.
- SFTP/FTP file browsing and transfers.
- URL Connections through WebView2.
- RDP and VNC workspace surfaces.
- Dashboard Module with draggable widgets and AI-created sandboxed widgets.
- Named tmux Sessions for long-running remote coding agents.
- Local-first storage, OS keychain secrets, and no telemetry.
- Built-in MCP tools so local coding agents can inspect and drive KKTerm with
  explicit permission boundaries.

Repo:

https://github.com/ryantsai/KKTerm

I am especially looking for feedback from Windows sysadmins, MSPs, DevOps
engineers, homelab users, and people running coding agents on remote machines.
If the project seems useful, a GitHub star helps me validate that this is worth
continuing publicly.

## X / Mastodon Thread

1. I am building KKTerm: a Windows-first local admin workspace for terminals,
   SSH, SFTP/FTP, RDP/VNC, URL Connections, dashboards, and approval-gated AI
   tools.

2. The premise: a lot of admins still work on Windows, but modern dev tooling
   often treats Windows as a secondary platform. KKTerm starts there instead.

3. It is Rust + Tauri v2 + React. Durable non-secret data stays in SQLite,
   secrets stay in the OS keychain, and there is no telemetry.

4. One feature I care about: SSH Panes can attach to named tmux Sessions, so
   long-running Claude Code/Codex/other coding-agent work can survive reconnects.

5. The Dashboard can host built-in widgets and sandboxed AI-created widgets, so
   small personal admin tools can live next to terminal and remote desktop work.

6. If you work in Windows-heavy ops, DevOps, MSP, or homelab environments, I
   would value feedback. Stars also help validate the project:
   https://github.com/ryantsai/KKTerm

## Email Outreach Template

Subject: KKTerm: Windows-first local admin workspace for terminal-heavy operators

Hi,

I am building KKTerm, an open-source Windows-first desktop admin workspace:

https://github.com/ryantsai/KKTerm

It combines local terminals, SSH, SFTP/FTP, URL Connections, RDP/VNC, Dashboard
widgets, and approval-gated AI tools in one local-first Tauri app. It stores
durable non-secret data in SQLite, keeps secrets in the OS keychain, and does
not ship telemetry.

The angle that may fit your audience: KKTerm is intentionally built for Windows
admins and terminal-heavy operators rather than treating Windows as an
afterthought. It also supports named tmux Sessions for long-running remote
coding agents and a built-in MCP surface for local agent workflows.

If this is relevant, I would appreciate a mention, a short feedback note, or
just a star if you think the project is worth watching.

Thanks,
Ryan

## Target Audiences

- Windows sysadmins and helpdesk engineers.
- MSP operators managing many customer machines.
- DevOps/SRE teams that still administer Windows, Hyper-V, IIS, AD, or RDP-heavy
  environments.
- Homelab users who use SSH, RDP, VNC, router admin UIs, and dashboards daily.
- Developers running Claude Code, Codex, or similar agents on remote machines.
- Tauri, Rust desktop, and local-first software communities.

## Channel Checklist

- GitHub metadata: description, topics, README star CTA.
- Hacker News: post a Show HN when a release or demo artifact is ready.
- Lobsters: submit if an account is available and the post fits community norms.
- Reddit: post only in communities where self-promotion is permitted and tailor
  the title/body to the subreddit.
- X/Mastodon/LinkedIn: use the thread copy and include the demo GIF.
- Discord/Slack communities: share only where project sharing is allowed.
- Email: use targeted outreach to newsletters, maintainers, or writers with a
  clear fit. Do not send bulk unsolicited email.

## Follow-Up Cadence

- Day 0: update GitHub metadata and publish first public posts.
- Day 1: respond to every comment and issue; ask useful commenters to star if
  they have not.
- Day 3: post one concrete technical thread about a distinctive feature
  (`tmux` resume, RDP ActiveX, MCP tools, or local-first keychain storage).
- Day 7: publish a release-note style update with star progress and what changed
  from feedback.
- Weekly until 100 stars: ship one visible improvement, post the change, and
  link the repo.

## Metrics Log

| Date | Stars | Action | Notes |
| --- | ---: | --- | --- |
| 2026-05-24 | 7 | Baseline; updated GitHub description and topics | Need public posts from authenticated social/community accounts |
| 2026-05-24 | 7 | Enabled GitHub Discussions and opened feedback thread | https://github.com/ryantsai/KKTerm/discussions/141 |
| 2026-05-24 | 7 | Rewrote latest release notes for public conversion | https://github.com/ryantsai/KKTerm/releases/tag/v0.1.34 |
| 2026-05-24 | 7 | Opened contributor-friendly issues | #142 first-run checklist; #143 README screenshots; #144 installer verification |
| 2026-05-24 | 7 | Added GitHub Pages landing page and set repo homepage | https://ryantsai.github.io/KKTerm/ |
| 2026-05-24 | 7 | Opened Awesome Tauri listing PR | https://github.com/tauri-apps/awesome-tauri/pull/715 |
| 2026-05-24 | 7 | Added demo GIF and Open Graph image to landing page | https://ryantsai.github.io/KKTerm/assets/demo.gif |
| 2026-05-24 | 7 | Opened Rust-community CFP issue for contributors | https://github.com/ryantsai/KKTerm/issues/145 |
| 2026-05-24 | 7 | Submitted KKTerm CFP to This Week in Rust | https://github.com/rust-lang/this-week-in-rust/pull/8118 |
| 2026-05-24 | 7 | Published GitHub launch announcement Discussion | https://github.com/ryantsai/KKTerm/discussions/146 |
| 2026-05-24 | 7 | Added landing-page SEO metadata, sitemap, robots, and SoftwareApplication JSON-LD | https://ryantsai.github.io/KKTerm/sitemap.xml |
| 2026-05-24 | 7 | Submitted KKTerm to Made with Tauri | https://madewithtauri.com/submitted |
| 2026-05-24 | 7 | Sent targeted outreach email from mail.ryantsai.com | suggestions@windowstechies.com |
