export function documentHasWebviewOverlay() {
  return Boolean(
    document.querySelector(
      ".quick-connect-menu, .sftp-context-menu, .sftp-properties-popover, .screenshot-region-overlay, .transfer-conflict-backdrop",
    ),
  );
}
