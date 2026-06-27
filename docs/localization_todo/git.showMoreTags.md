# git.showMoreTags

- **English value**: `… {{count}} more`
- **Namespace**: `git`
- **File/component**: `src/modules/git/GitSidebar.tsx`
- **UI role**: `button`
- **User flow**: Git Browser sidebar Tags section. When a repo has more than 10 tags, only the newest 10 are shown; this clickable row reveals the remaining hidden tags.
- **Tone**: concise/neutral
- **Placeholders**: `{{count}}` — the number of hidden tags; keep the token unchanged so it survives in every locale. The leading `…` is a literal ellipsis character.
- **Context/meaning**: "more" = additional collapsed tags to reveal, not a menu. Pairs with `git.showFewerTags` which collapses them again.
- **Domain notes**: Git terms (branch, tag, worktree, rebase, reset, stash, HEAD, remote) follow each locale's established git terminology; keep the `{{count}}` token unchanged.

<!--
Filename: git.showMoreTags.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
