export function documentHasWebviewOverlay() {
  return Boolean(
    document.querySelector(
      ".quick-connect-menu, .sftp-context-menu, .sftp-properties-popover, .screenshot-menu, .screenshot-region-overlay, .transfer-conflict-backdrop",
    ),
  );
}
