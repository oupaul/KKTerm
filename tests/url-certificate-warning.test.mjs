import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const backend = readFileSync("src-tauri/src/webview.rs", "utf8");
const workspace = readFileSync(
  "src/modules/workspace/connections/webview/WebViewWorkspace.tsx",
  "utf8",
);

test("macOS reports rejected URL certificates without bypassing validation", () => {
  assert.match(backend, /fn configure_wkwebview_certificate_error_handling\(/);
  assert.match(
    backend,
    /cfg!\(target_os = "macos"\)[\s\S]*parse_webview_blank_url/,
  );
  assert.match(
    backend,
    /sec_trust_evaluate\(server_trust, &mut trust_result\)/,
  );
  assert.match(backend, /if !trusted \{[\s\S]*"webview-certificate-error"/);
  assert.match(
    backend,
    /if bypass_enabled\.is_null\(\) \{[\s\S]*block\.call\(\(disposition/,
  );
});

test("macOS installs certificate handling on Wry's live navigation delegate class", () => {
  assert.match(backend, /msg_send!\[webview, navigationDelegate\]/);
  assert.match(backend, /object_getClass\(navigation_delegate\.cast\(\)\)/);
  assert.doesNotMatch(backend, /AnyClass::get\(c"WryNavigationDelegate"\)/);
});

test("URL workspace turns certificate errors into a warning notice", () => {
  assert.match(
    workspace,
    /listen<WebviewCertificateErrorEvent>\("webview-certificate-error",[\s\S]*showStatusBarNotice\(t\("webview\.invalidCertificateWarning"\), \{ tone: "warning" \}\)/,
  );
  assert.match(
    workspace,
    /!webviewEventsReady[\s\S]*invokeCommand\("start_webview_session"/,
  );
});
