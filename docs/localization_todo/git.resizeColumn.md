# git.resizeColumn

- **English value**: `Resize {{column}} column`
- **Namespace**: `git`
- **File/component**: `src/modules/git/GitGraph.tsx`
- **UI role**: `tooltip`
- **User flow**: Accessible label for the draggable splitter on a History commit-pane column header (Author, SHA, When), used to adjust that column's width.
- **Tone**: concise/neutral
- **Placeholders**: `{{column}}` — the translated column name (e.g. Author, SHA, When); keep the token unchanged so it survives in every locale.
- **Context/meaning**: Git Browser overlay string. "Resize" = change the column's width by dragging, not resize a window. `{{column}}` is interpolated with another already-translated column-header label.
- **Domain notes**: Git terms (branch, tag, worktree, rebase, reset, stash, HEAD, remote) follow each locale's established git terminology; keep the `{{column}}` token unchanged.

<!--
Filename: git.resizeColumn.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
