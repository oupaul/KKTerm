# dashboard.widgetLibraryLoadFailed

- **English value**: `Failed to load widget libraries: {{error}}`
- **Namespace**: `dashboard` (mapped under the `app`/dashboard surface in en.json)
- **File/component**: `src/dashboard/script/ScriptWidgetHost.tsx`
- **UI role**: `error`
- **User flow**: Shown inside a script widget's body when one or more of its declared `libraries` (e.g. `mermaid`, `qrcode`) cannot be fetched and prepared. The widget body is replaced by this single error line. Surfaces during dashboard rendering, not during widget creation.
- **Tone**: short, direct error
- **Placeholders**: `{{error}}` — raw error message from the loader (English from the browser / esbuild; not translated).
- **Domain notes**: "Widget libraries" refers to the curated set of bundled npm packages a Dashboard script widget can request (mermaid, qrcode, echarts, three, etc.). Keep "library" / "libraries" as the user-facing term; do not translate as "package" or "module".
