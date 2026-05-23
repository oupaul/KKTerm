# KKTerm Built-in MCP Server (`kkterm-cli`)

## Overview

KKTerm now includes a Rust-native stdio MCP server binary: `kkterm-cli`.

Current implementation focuses on MCP protocol plumbing and tool contract stability, with a strict tool namespace split:

- `kkterm.*` — curated allowlist tools.
- `kkterm.dangerous.*` — sensitive tools that may mutate sessions/UI.

## Transport

- **Transport:** stdio (JSON-RPC messages over stdin/stdout)
- **Binary:** `src-tauri/src/bin/kkterm-cli.rs`
- **Cargo bin target:** `kkterm-cli`

## Tool safety model

Built-in MCP dangerous calls support an optional confirmation gate. By default:

- dangerous tools require confirmation
- users may opt into **Allow All** under:
  - Settings → AI Settings → Built-in MCP Server

The setting is persisted in `AiProviderSettings.built_in_mcp_allow_all_dangerous`.

## Tool namespaces

### Curated allowlist (`kkterm.*`)

- `kkterm.connections.open`
- `kkterm.sessions.send_input`
- `kkterm.sessions.read_buffer`

### Dangerous namespace (`kkterm.dangerous.*`)

- `kkterm.dangerous.pointer_click`

## Feature growth contract (required for new MCP functions)

When adding a new built-in MCP function/tool, update all of the following in the same PR:

1. `src-tauri/src/bin/kkterm-cli.rs`
   - register tool in `tools/list`
   - implement handler in `tools/call`
   - document input schema changes inline
2. `docs/MCP.md`
   - add tool to namespace list
   - document risk level and confirmation behavior
3. `docs/manual/15-settings.md`
   - update Built-in MCP Server setting behavior if safety toggles change
4. `AGENTS.md`
   - keep this update rule referenced so future contributors don't skip MCP route updates

## Design notes

- Rust-native CLI keeps dependencies low and avoids a separate Node runtime.
- Stdio MCP server is architected so future non-MCP CLI features can share the same binary.
- Runtime bridge wiring to a live KKTerm app/session manager is intentionally incremental; protocol/tool contract is landed first.


## Client setup examples

Use the `kkterm-cli` binary path in your MCP client settings.

- **Claude Code / Claude Desktop style config**
```json
{
  "mcpServers": {
    "kkterm": {
      "command": "<path-to-kkterm-cli>",
      "args": []
    }
  }
}
```

- **Codex-style local MCP command**
  - add a stdio MCP server named `kkterm`
  - command: `<path-to-kkterm-cli>`
  - args: none

- **GitHub Copilot agent/tooling that supports MCP stdio**
  - register `kkterm-cli` as an MCP stdio server command

- **Antigravity / other MCP-capable clients**
  - add stdio server command pointing to `kkterm-cli`

After configuration, reconnect the client and run `tools/list` to verify connectivity.
