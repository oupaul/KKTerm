# Connection Environment Variables Helper

## Goal

Generalize the Local Connection CLI-account helper into a compact environment
variable manager. Users can manage non-secret environment variables for one
Local Connection, while Claude Code and Codex account setup remains available
as a guided helper inside that manager.

## Scope

- Replace `connections.cliAccountHelper` beside Startup script with an
  Environment variables action.
- Open an app-owned mini-dialog containing editable variable name/value rows.
- Support adding, editing, and removing multiple variables.
- Keep variables specific to the Local Connection by storing a generated block
  in that Connection's existing `localStartupScript` field.
- Preserve hand-written Startup script commands outside the generated block.
- Support Command Prompt, PowerShell/PowerShell 7, WSL, Bash, and zsh.
- Keep Claude Code and Codex account setup as a helper wizard launched from the
  environment-variable dialog.
- Treat managed values as non-secret configuration. Do not add keychain storage,
  a database migration, or secret-variable lifecycle in this change.

## User Experience

The Local Connection form keeps its existing Startup script textarea. A compact
secondary action beside its label opens an app-owned mini-dialog titled through
`connections.environmentVariables`.

The dialog body contains:

1. A concise explanation that variables apply only when this Connection starts
   and that secret values should not be stored here.
2. A list of name/value rows with a remove action on each row.
3. An Add variable action.
4. A CLI account helper action that opens a nested wizard for Claude Code or
   Codex.
5. Platform-ordered Cancel and Apply actions using shared dialog primitives.

Render the manager with `DialogShell` and `Sheet` at a compact width above the
existing Connection dialog. The nested CLI helper uses the same established
subdialog pattern and temporarily covers the manager rather than expanding the
Connection form inline. Neither dialog has a title-bar close button because
each footer already includes Cancel.

An empty initial row is shown when no managed block exists. Applying an entirely
empty list removes the existing KKTerm-managed block. Cancel leaves the visible
Startup script unchanged.

The CLI account wizard retains the existing tool selector, account label,
stable directory preview, and validation. Applying the wizard adds or replaces
the corresponding managed variable (`CLAUDE_CONFIG_DIR` or `CODEX_HOME`) in the
parent dialog, then returns to the variable list. It does not immediately alter
the Startup script or save the Connection.

The existing CLI account helper creates the account directory explicitly. A
managed row therefore has an internal `literal` or `cliAccount` source. Literal
rows render shell-escaped values and never create directories. CLI account rows
render the trusted platform-root expression and create that directory. The
source is restored when reopening by recognizing the exact generated variable,
path shape, and adjacent directory command; a manually entered
`CLAUDE_CONFIG_DIR` or `CODEX_HOME` remains a literal row.

## Validation

- Names must match a portable environment-variable shape:
  `[A-Za-z_][A-Za-z0-9_]*`.
- Names are compared case-insensitively because Local Connections may use
  Windows shells; duplicates are rejected rather than silently overwritten.
- Values may be empty and remain literal empty strings.
- Unknown custom shells cannot open the manager because KKTerm cannot safely
  generate their assignment syntax.
- Validation remains in the dialog because it blocks completion. Applying the
  dialog has no transient success notice because the edited Startup script is
  visibly updated and the Connection has not yet been saved.

## Generated Script Contract

The generated block uses shell-specific begin/end comments that identify one
KKTerm environment-variable block. It contains one assignment per managed row,
in the order shown in the dialog:

- Command Prompt: `set "NAME=value"`
- PowerShell: `$env:NAME = "value"`
- POSIX: `export NAME="value"`

Literal values are escaped for the selected shell's quoted assignment form,
including shell expansion characters, so the entered text round-trips without
becoming executable syntax. CLI account rows use a separate trusted renderer so
their `%LOCALAPPDATA%`, `$env:LOCALAPPDATA`, or POSIX data-root expression still
expands. Newlines in values are rejected because they would turn one managed
value into executable Startup script content.

Wizard-created account variables use the existing stable roots:

- Native Windows: `%LOCALAPPDATA%\KKTerm\cli-accounts\<tool>\<slug>`
- POSIX, macOS, and WSL:
  `${XDG_DATA_HOME:-$HOME/.local/share}/kkterm/cli-accounts/<tool>/<slug>`

The generated block creates only `cliAccount` rows' directories, using the
existing shell-appropriate idempotent command. Parsing KKTerm's own rendered
syntax decodes escaped literal values back into the exact dialog text.

Applying replaces the previous marked environment block without modifying text
outside it. The parser also recognizes the currently shipped `KKTerm CLI account
environment` block and imports its assignment into the manager so existing
Connections upgrade in place, including its account-directory behavior. On
Apply, the legacy block is replaced by the new general environment block. If a
marked block is malformed, the manager reports
that it cannot safely edit the block and leaves the Startup script unchanged.

## Architecture

Rename and generalize the existing pure helper in
`src/modules/workspace/connections/connection-dialog/`. It owns shell-family
classification, portable-name validation, shell escaping, parsing recognized
managed blocks, rendering the generalized block, applying/removing it from a
script, and the CLI account directory helper.

Move the interactive surface out of `LocalConnectionFields.tsx` into a focused
dialog component in the same source area. `LocalConnectionFields.tsx` owns only
the controlled Startup script and dialog open state. The dialog edits a draft
list and returns a replacement script only when Apply succeeds.

The existing `ConnectionSidebar.tsx` submission, SQLite schema,
`localStartupScript` storage, and `localStartupInputFor` Session startup path stay
unchanged. No Rust command, MCP schema change, credential-store change, or
tutorial mapping is required.

## Localization and Manual

Replace the CLI-only labels with `connections.*` keys for the manager, row
controls, non-secret guidance, validation, malformed-block handling, and nested
CLI helper. Keep existing Claude Code/Codex labels where their meaning remains
identical. Follow `docs/localization_todo/README.md` for every added or changed
English key and verify locale structure.

Update `docs/manual/03-connections.md` to document Connection-specific
environment variables, supported shells, non-secret storage, replacement of the
marked Startup script block, and the nested Claude Code/Codex account helper.

## Verification

Focused test-first coverage will verify:

1. Name validation, duplicate detection, and newline rejection.
2. Correct escaping and rendering for Command Prompt, PowerShell, and POSIX.
3. Parsing and round-tripping the generalized managed block.
4. Importing the legacy CLI-account block.
5. Preserving unrelated Startup script content when replacing or removing a
   managed block.
6. Claude Code and Codex wizard variables retain stable paths and directory
   creation behavior.
7. The Local Connection UI opens the translated mini-dialog and exposes the
   nested CLI account helper.
8. TypeScript and localization checks remain green.

Because this remains a focused frontend behavior change and reuses existing
persistence, the full Rust suite is not required. Final interactive validation
should use the real Tauri runtime for at least one recognized shell.
