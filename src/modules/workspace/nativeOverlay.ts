const NATIVE_BLOCKING_OVERLAY_SELECTOR = [
  ".sftp-context-menu",
  ".sftp-properties-popover",
  ".screenshot-region-overlay",
  ".assistant-image-preview-backdrop",
  ".transfer-conflict-backdrop",
  ".connection-dialog-backdrop",
  ".app-launcher-dialog-backdrop",
  ".settings-backdrop",
  ".settings-page",
  ".status-popup",
  ".tutorial-overlay",
  ".dw-catalog-backdrop",
  ".dw-customize",
  ".tree-drag-preview",
  ".dock-overlay",
].join(", ");

const WEBVIEW_BLOCKING_OVERLAY_SELECTOR = [
  ".connection-dialog-backdrop",
  ".settings-backdrop",
  ".dw-catalog-backdrop",
  ".screenshot-region-overlay",
  // The status notice popup is anchored to the top title-bar band and overlaps the
  // top of the URL Connection's native browser surface. Suppress the live WebView with
  // a snapshot while the popup is visible so the popup is not clipped behind the browser.
  ".status-popup",
  ".tree-drag-preview",
  ".dock-overlay",
].join(", ");

export function documentHasRdpBlockingOverlay(surface: Element | null) {
  return documentHasNativeBlockingOverlay(surface);
}

export function documentHasWebviewBlockingOverlay(surface: Element | null) {
  return documentHasNativeBlockingOverlay(surface, WEBVIEW_BLOCKING_OVERLAY_SELECTOR);
}

function documentHasNativeBlockingOverlay(
  surface: Element | null,
  selector = NATIVE_BLOCKING_OVERLAY_SELECTOR,
) {
  const surfaceRect = visibleRect(surface);
  if (!surfaceRect) {
    return false;
  }
  return Array.from(document.querySelectorAll(selector)).some((overlay) => {
    const overlayRect = visibleRect(overlay);
    return Boolean(overlayRect && rectsIntersect(surfaceRect, overlayRect));
  });
}

function visibleRect(element: Element | null) {
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return rect;
}

function rectsIntersect(first: DOMRect, second: DOMRect) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}
