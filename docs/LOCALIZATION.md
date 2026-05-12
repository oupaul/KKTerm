# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

No pending strings — all keys are translated across all 14 supported locales.

## Dashboard redesign (2026-05-11)

| key | English | namespace | file | role | flow | tone | placeholders |
|-----|---------|-----------|------|------|------|------|--------------|
| `dashboard.addWidgetLabel` | Add Widget | dashboard | src/dashboard/DashboardPage.tsx | button | Dashboard topbar add widget | imperative | none |
| `dashboard.newViewPrompt` | View name | dashboard | src/dashboard/DashboardPage.tsx | placeholder | Dashboard view rename inline input | neutral | none |
| `dashboard.renameView` | Rename view | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard view context / aria | imperative | none |
| `dashboard.removeView` | Remove view | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard view tab close aria-label | imperative | none |
| `dashboard.editLayout` | Edit Layout | dashboard | src/dashboard/DashboardPage.tsx | button | Dashboard topbar edit mode toggle | imperative | none |
| `dashboard.editDone` | Done | dashboard | src/dashboard/DashboardPage.tsx | button | Dashboard topbar exit edit mode | imperative | none |
| `dashboard.density.compact` | Compact | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard density selector option | neutral | none |
| `dashboard.density.default` | Default | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard density selector option | neutral | none |
| `dashboard.density.roomy` | Roomy | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard density selector option | neutral | none |
| `dashboard.catalogTitle` | Widget Catalog | dashboard | src/dashboard/edit/CatalogOverlay.tsx | heading | Widget catalog overlay header | neutral | none |
| `dashboard.catalogSearch` | Search widgets… | dashboard | src/dashboard/edit/CatalogOverlay.tsx | placeholder | Widget catalog search input | neutral | none |
| `dashboard.catalogAll` | All | dashboard | src/dashboard/edit/CatalogOverlay.tsx | label | Widget catalog category filter — all | neutral | none |
| `dashboard.catalogNoMatches` | No widgets match. | dashboard | src/dashboard/edit/CatalogOverlay.tsx | status | Widget catalog empty search result | neutral | none |
| `dashboard.preset` | Preset | dashboard | src/dashboard/edit/CustomizePopover.tsx | heading | Widget customize popover preset section | neutral | none |
| `dashboard.accent` | Accent | dashboard | src/dashboard/edit/CustomizePopover.tsx | heading | Widget customize popover accent section | neutral | none |
| `dashboard.icon` | Icon | dashboard | src/dashboard/edit/CustomizePopover.tsx | heading | Widget customize popover icon section | neutral | none |
| `dashboard.titlePlaceholder` | Custom title… | dashboard | src/dashboard/edit/CustomizePopover.tsx | placeholder | Widget customize title input | neutral | none |
| `dashboard.advanced` | Advanced | dashboard | src/dashboard/edit/CustomizePopover.tsx | label | Widget customize advanced section toggle | neutral | none |
| `dashboard.advancedNothing` | No advanced settings for built-in widgets. | dashboard | src/dashboard/edit/CustomizePopover.tsx | status | Widget customize advanced empty state | neutral | none |
| `dashboard.scriptNetwork` | Allow network | dashboard | src/dashboard/edit/CustomizePopover.tsx | label | Script widget network permission toggle | neutral | none |
| `dashboard.scriptPollSeconds` | Poll interval (seconds) | dashboard | src/dashboard/edit/CustomizePopover.tsx | label | Script widget poll interval input | neutral | none |
| `dashboard.scriptViewSource` | View source | dashboard | src/dashboard/edit/CustomizePopover.tsx | label | Script widget view-source disclosure | neutral | none |
| `dashboard.scriptInvalidBody` | Script body is not valid JSON. | dashboard | src/dashboard/edit/CustomizePopover.tsx | status | Script widget JSON validation error | neutral | none |
| `dashboard.untitledWidget` | Widget | dashboard | src/dashboard/view/WidgetFrame.tsx | label | Widget frame fallback title | neutral | none |
| `dashboard.customize` | Customize widget | dashboard | src/dashboard/view/WidgetFrame.tsx | label | Widget frame customize button aria-label | imperative | none |
| `dashboard.cidrInput` | CIDR block | dashboard | src/dashboard/widgets/SubnetBody.tsx | label | Subnet calculator CIDR input label | neutral | none |
| `dashboard.network` | Network | dashboard | src/dashboard/widgets/SubnetBody.tsx | label | Subnet calculator network address row | neutral | none |
| `dashboard.broadcast` | Broadcast | dashboard | src/dashboard/widgets/SubnetBody.tsx | label | Subnet calculator broadcast address row | neutral | none |
| `dashboard.mask` | Subnet mask | dashboard | src/dashboard/widgets/SubnetBody.tsx | label | Subnet calculator subnet mask row | neutral | none |
| `dashboard.usable` | Usable hosts | dashboard | src/dashboard/widgets/SubnetBody.tsx | label | Subnet calculator usable host count row | neutral | none |
| `dashboard.subnetInvalid` | Enter a valid CIDR block, e.g. 192.168.1.0/24. | dashboard | src/dashboard/widgets/SubnetBody.tsx | status | Subnet calculator invalid input error | neutral | none |
| `dashboard.reportStep1` | Confirm current backup age. | dashboard | src/dashboard/widgets/ReportBody.tsx | fragment | Maintenance report checklist item 1 | neutral | none |
| `dashboard.reportStep2` | Review changed Connections before maintenance. | dashboard | src/dashboard/widgets/ReportBody.tsx | fragment | Maintenance report checklist item 2 | neutral | none |
| `dashboard.reportStep3` | Capture terminal evidence only when explicitly needed. | dashboard | src/dashboard/widgets/ReportBody.tsx | fragment | Maintenance report checklist item 3 | neutral | none |
| `dashboard.reportStep4` | Keep command execution approval-based. | dashboard | src/dashboard/widgets/ReportBody.tsx | fragment | Maintenance report checklist item 4 | neutral | none |
| `dashboard.tool` | Tool | dashboard | src/dashboard/widgets/QuickToolsBody.tsx | label | Quick Tools widget tool selector label | neutral | none |
| `dashboard.input` | Input | dashboard | src/dashboard/widgets/QuickToolsBody.tsx | label | Quick Tools widget input field label | neutral | none |
| `dashboard.output` | Output | dashboard | src/dashboard/widgets/QuickToolsBody.tsx | label | Quick Tools widget output field label | neutral | none |
| `dashboard.assistantSummary` | Browse and manage Dashboard widgets through the AI Assistant. | dashboard | src/dashboard/DashboardPage.tsx | label | Dashboard AI assistant context summary | neutral | none |
| `settings.sectionDashboard` | Dashboard | settings | src/settings/SettingsPage.tsx | label | Settings sidebar Dashboard section nav item | neutral | none |
| `settings.dashboardTitle` | Dashboard Settings | settings | src/settings/DashboardSettings.tsx | heading | Dashboard settings page title | neutral | none |
| `settings.dashboardDescription` | Configure default layout, widget behavior, and view management for the Dashboard. | settings | src/settings/DashboardSettings.tsx | label | Dashboard settings page description | neutral | none |
| `settings.dashboardReset` | Reset Dashboard | settings | src/settings/GeneralSettings.tsx | button | General settings Dashboard reset action button | imperative | none |
| `settings.dashboardResetTitle` | Reset Dashboard | settings | src/settings/GeneralSettings.tsx | heading | Dashboard reset confirmation dialog title | imperative | none |
| `settings.dashboardResetBody` | This deletes all Dashboard views, widget instances, and AI-authored custom widgets. The Default view will be restored with one App Launcher widget. This cannot be undone. | settings | src/settings/GeneralSettings.tsx | label | Dashboard reset confirmation dialog body | neutral | none |
| `settings.dashboardResetConfirm` | Reset Dashboard | settings | src/settings/GeneralSettings.tsx | button | Dashboard reset confirmation dialog confirm button | imperative | none |
| `settings.dashboardResetDone` | Dashboard reset to defaults. | settings | src/settings/GeneralSettings.tsx | status | Dashboard reset success toast/status | neutral | none |
| `settings.dashboardGeneral` | General | settings | src/settings/DashboardSettings.tsx | heading | Dashboard settings General subsection heading | neutral | none |
| `settings.dashboardConfirmRemove` | Ask for confirmation before removing a widget | settings | src/settings/DashboardSettings.tsx | label | Dashboard settings confirm-remove toggle label | neutral | none |
| `settings.dashboardDefaultLanding` | Default view on open | settings | src/settings/DashboardSettings.tsx | label | Dashboard settings default landing view select label | neutral | none |
| `settings.dashboardLandingLast` | Last active view | settings | src/settings/DashboardSettings.tsx | label | Dashboard settings landing option — last active | neutral | none |
| `settings.aiTools.dashboard.label` | Dashboard | settings | src/settings/GeneralSettings.tsx | label | AI tools permission entry label for Dashboard | neutral | none |
| `settings.aiTools.dashboard.description` | Read and modify Dashboard views, widget instances, and custom widgets. | settings | src/settings/GeneralSettings.tsx | label | AI tools permission entry description for Dashboard | neutral | none |
