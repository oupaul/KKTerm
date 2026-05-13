import type { ScriptBody } from "../types";

export function buildCsp(perm: ScriptBody["permissions"]): string {
  const connect = perm.network ? "*" : "'none'";
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline' blob:",
    `connect-src ${connect}`,
    "img-src data: blob:",
    "font-src data:",
  ].join("; ");
}

function scriptStringLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildSrcdoc(body: ScriptBody): string {
  const csp = buildCsp(body.permissions);
  const shim = body.htmlShim?.trim().length ? body.htmlShim : '<div id="root"></div>';
  const source = scriptStringLiteral(body.source);
  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, "&quot;")}" />
  <style>
    html, body { margin: 0; padding: 8px; font-family: ui-sans-serif, system-ui, sans-serif; color: #222; font-size: 13px; }
    body { background: transparent; }
    .kk-widget-error { color: #b00; white-space: pre-wrap; font: 12px/1.4 ui-monospace, monospace; }
  </style>
</head><body>
  ${shim}
  <script>
    (function () {
      const KK = {
        postMessage: function (payload) { window.parent.postMessage({ kk: true, payload }, "*"); },
        requestPermission: function () { return Promise.resolve(false); },
      };
      window.KK = KK;
      function showError(err) {
        const pre = document.createElement('pre');
        pre.className = 'kk-widget-error';
        pre.textContent = String(err && (err.stack || err.message) || err);
        document.body.replaceChildren(pre);
      }
      window.addEventListener('error', function (event) {
        showError(event.error || event.message);
      });
      window.addEventListener('unhandledrejection', function (event) {
        showError(event.reason);
      });
      try {
        const source = ${source};
        const blob = new Blob([source + '\\n//# sourceURL=kkterm-dashboard-widget.js'], { type: 'text/javascript' });
        const script = document.createElement('script');
        script.src = URL.createObjectURL(blob);
        script.onload = function () { URL.revokeObjectURL(script.src); };
        script.onerror = function () { showError(new Error('Widget script failed to load.')); };
        document.head.appendChild(script);
      } catch (err) {
        showError(err);
      }
    })();
  </script>
</body></html>`;
}
