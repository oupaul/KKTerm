# connections.closeAllInFolder

- **English value**: `Close all connections`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/ConnectionSidebar.tsx`
- **UI role**: `button`
- **User flow**: Shown in the right-click context menu of a Connection folder in the sidebar tree. Selecting it closes every open Tab and Pane for every Connection inside that folder (child folders included). Disabled when nothing in the folder is currently open.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Close" = end the open Tabs/Panes (live Sessions) for the folder's Connections, the folder-wide counterpart of `connections.closeConnection`. It does not delete the Connections.
- **Domain notes**: "Connection" is a durable openable resource (use the locale's established term, e.g. zh-TW 連線 / zh-CN 连接), not "profile". Best-effort translations were added to every non-English locale; review before deleting this file.
