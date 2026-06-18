# App Update Progress Popup Design

## Goal

Add a reusable determinate-progress variant to KKTerm's shared Status Bar popup and use it for App update downloads. The popup must show real download progress, allow the user to cancel an in-flight download, remain visible at 100% for three seconds, and only then continue into installation or relaunch.

## Scope

- Extend the existing shared Status Bar notice model and renderer with a `progress` variant.
- Connect App update downloads on every supported update strategy to actual byte progress.
- Make the close button cancel an in-flight App update download.
- Separate downloading from installation so completion can remain visible for three seconds.
- Update user-visible strings, localization backlog records, the relevant manual chapter, and focused tests.

The work does not add a second notification system, redesign the update-available dialog, or generalize cancellation to unrelated transfers.

## User Experience

The progress popup uses the existing Information popup's placement, glass surface, entry/exit motion, and information color token. It uses Lucide's `CircleGauge` icon to distinguish determinate work from a normal informational message.

The popup contains:

- a localized download message;
- the current whole-number percentage;
- a determinate progress track filled from left to right using actual downloaded and total bytes;
- fixed `0%` and `100%` endpoint labels;
- the existing top-right close button.

It does not use the five-second countdown hairline. Before completion, pressing close requests cancellation, closes the popup after cancellation is acknowledged, and prevents installation. At 100%, the popup remains visible for 3,000 milliseconds. Installation or relaunch starts after that delay. If the user closes the completed popup during the delay, the visual closes but the already-downloaded update still installs when the delay ends; cancellation applies only while network downloading is active.

Download failure replaces the progress popup with the existing persistent error notice. Successful completion does not add a second success notice.

## Architecture

### Shared progress notice

Extend `StatusBarNotice` with an explicit discriminated progress shape rather than overloading `durationMs`. The store exposes narrowly scoped actions to show, update, complete, and clear one progress notice. The notice owns an optional cancellation callback or cancellation identifier supplied by its caller.

`StatusBar.tsx` renders the existing notice variants unchanged. For a progress notice it renders `CircleGauge`, the determinate bar, endpoint labels, and percentage, and omits the countdown timer. Progress values are clamped to `0..100` before display.

### Update download contract

Refactor `src/lib/appUpdates.ts` so update work has two explicit phases:

1. download with progress and cancellation;
2. install/relaunch after the caller authorizes continuation.

The frontend receives normalized progress events containing downloaded bytes, optional total bytes, and a derived ratio. A determinate percentage is emitted only when a non-zero total is known. Update metadata is expected to provide a total for release assets; if a provider temporarily omits it, the popup remains at its last known determinate value rather than fabricating progress.

Windows update downloading moves behind a job identifier. The backend emits progress for that job, checks a cancellation flag while streaming, removes partial files when cancelled or failed, and returns a cancelled result without spawning the installer. A dedicated cancellation command changes that flag. Checksum verification remains mandatory before the frontend is allowed to proceed to installation.

For the Tauri updater strategy, use the plugin's separate download and install operations and its download event callback. Cancellation must stop the active download operation through the supported updater cancellation mechanism. If the installed plugin version cannot provide real cancellation, implementation must stop and report that platform limitation rather than presenting a close button that only hides an active transfer.

### App update flow

`AppUpdatePrompt` keeps the update-available confirmation dialog. After the user presses Download and install, it closes that dialog, creates the progress popup at 0%, and starts the cancellable download.

Progress events update the same popup. On cancellation, the download ends and no installer is started. On failure, the progress popup clears and the existing translated failure notice appears. On verified completion, progress is set to 100%, a three-second timer starts, and then the install/relaunch phase runs.

Unmount cleanup removes listeners and timers. It must not accidentally install a cancelled update or leave an update job running without a visible owner.

## Accessibility

The progress track uses `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="100"`, and the current `aria-valuenow`. Progress text uses a polite live region without announcing every downloaded byte. The close button receives a localized label that states it cancels the download while the transfer is active.

Reduced-motion behavior follows the existing Status Bar popup rules. Progress itself is represented by width and text, so it does not depend on animation.

## Localization and Documentation

Add English keys first for the progress message, percentage/accessibility text, and cancellation action or result where existing keys are not semantically correct. Follow `docs/localization_todo/README.md` for each new key. Update `docs/manual/02-app-layout.md` to document the progress notice lifecycle and the App update use case. Update other updater documentation only where the actual download/install lifecycle changes its current description.

## Testing

Focused tests must cover:

- the progress notice type and store lifecycle;
- clamping and rendering of 0%, intermediate progress, and 100%;
- no five-second timer for progress notices;
- cancellation before completion prevents installation;
- completion waits three seconds before installation;
- update download progress is derived from real byte counts;
- backend cancellation removes partial downloads and does not spawn an installer;
- existing success, information, warning, and error notices remain unchanged;
- locale key/order parity and the relevant manual contract.

Implementation follows red-green-refactor. The full repository suite is not required unless the resulting code change exceeds the repository's 500-line threshold; focused frontend tests, TypeScript checking, and targeted Rust tests/checks are required for the touched paths.

## Success Criteria

- Download and install shows one shared Status Bar progress popup with a `CircleGauge` icon.
- The bar reports actual download progress from 0% through 100% and displays fixed endpoint labels.
- Closing during download stops the transfer, removes partial state, and never installs.
- The popup remains at 100% for three seconds before installation/relaunch begins.
- Failures remain visible and actionable through the existing error-notice behavior.
- Windows and Tauri updater strategies do not claim cancellation unless the underlying transfer was actually stopped.
