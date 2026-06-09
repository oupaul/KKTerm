//! Embedded URL-browser backend.
//!
//! URL Connections use stable top-level `WebviewWindow`s instead of Tauri's
//! `unstable` child-webview API. Each browser window is borderless, owned by
//! the main window, skipped from the taskbar, and positioned over the URL Pane's
//! DOM rect. This keeps wry's normal window-content WebView2 focus path for the
//! main terminal webview while still giving URL Connections a real WebView2.

use std::{
    collections::{HashMap, HashSet},
    sync::{
        Arc, Mutex, MutexGuard,
        atomic::{AtomicBool, Ordering},
    },
};

use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
    webview::{DownloadEvent, NewWindowResponse, PageLoadEvent},
};

const HOST_WINDOW_LABEL: &str = "main";
const DEFAULT_PARTITION: &str = "shared";
const HIDDEN_WEBVIEW_POSITION: f64 = -32_000.0;

/// WebView2 browser arguments that keep the renderer alive across RDP session
/// disconnect/reconnect. Passed to the main window and URL overlay windows when
/// the Settings RDP stability option is active; all WebView2 surfaces in one
/// process must agree on these args.
#[cfg(target_os = "windows")]
pub(crate) const REMOTE_SESSION_WEBVIEW2_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion --disable-gpu";

const AUTOFILL_AGENT: &str = r#"
(() => {
  const TITLE_CHANNEL = "__KKTERM_URL_CREDENTIAL__";

  function publish(payload) {
    const previousTitle = document.title;
    document.title = `${TITLE_CHANNEL}${JSON.stringify(payload)}`;
    window.setTimeout(() => {
      if (document.title.startsWith(TITLE_CHANNEL)) {
        document.title = previousTitle;
      }
    }, 150);
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function usableInput(input) {
    return input instanceof HTMLInputElement && !input.disabled && !input.readOnly && input.type !== "hidden" && isVisible(input);
  }

  function usableText(input) {
    if (input instanceof HTMLTextAreaElement) return !input.disabled && !input.readOnly && isVisible(input);
    if (!usableInput(input)) return false;
    return ["", "text", "email", "tel", "search", "url", "number"].includes((input.getAttribute("type") || "text").toLowerCase());
  }

  function queryInput(selector) {
    if (!selector) return undefined;
    try {
      const input = document.querySelector(selector);
      return usableText(input) || usableInput(input) ? input : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function passwordInput(requireValue) {
    return Array.from(document.querySelectorAll("input[type='password']"))
      .filter(usableInput)
      .filter((input) => !requireValue || input.value)
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height))[0];
  }

  function textCandidates(root) {
    return Array.from((root || document).querySelectorAll("input, textarea")).filter(usableText);
  }

  function usernameInput(password) {
    const root = password?.form || password?.closest?.("form") || document;
    const candidates = textCandidates(root).filter((input) => input !== password);
    if (!candidates.length) return undefined;
    return candidates
      .map((input, index) => {
        const label = [input.name, input.id, input.autocomplete, input.getAttribute("aria-label"), input.placeholder].filter(Boolean).join(" ").toLowerCase();
        let score = index;
        if (input.value) score += 40;
        if (/user|email|login|account|name/.test(label)) score += 100;
        if (/one-time|otp|code|search/.test(label)) score -= 100;
        return { input, score };
      })
      .sort((a, b) => b.score - a.score)[0].input;
  }

  function setInputValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor.set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function selectorFor(input) {
    const tag = input.tagName.toLowerCase();
    for (const attr of ["id", "name", "autocomplete", "aria-label", "placeholder"]) {
      const value = input.getAttribute(attr);
      if (!value) continue;
      const selector = `${tag}[${CSS.escape(attr)}=${JSON.stringify(value)}]`;
      try {
        if (document.querySelector(selector) === input) return selector;
      } catch (_) {}
    }
    return tag;
  }

  window.__KKTERM_URL_AUTOFILL__ = {
    fill(credential) {
      const password = queryInput(credential.passwordSelector) || passwordInput(false);
      if (!password || (credential.automatic && password.value)) return { filled: false };
      const username = queryInput(credential.usernameSelector) || usernameInput(password);
      if (username && credential.username && (!credential.automatic || !username.value)) {
        setInputValue(username, credential.username);
      }
      setInputValue(password, credential.password || "");
      if (!credential.automatic) password.focus({ preventScroll: true });
      return { filled: true };
    },
    capture(nonce) {
      const password = passwordInput(true);
      if (!password) {
        publish({ ok: false, nonce, reason: "no-password-field", url: window.location.href });
        return;
      }
      const username = usernameInput(password);
      const passwordValue = password.value || "";
      const usernameValue = username?.value || window.location.host || window.location.href;
      if (!passwordValue) {
        publish({ ok: false, nonce, reason: "empty-password", url: window.location.href });
        return;
      }
      publish({
        ok: true,
        nonce,
        url: window.location.href,
        username: usernameValue,
        password: passwordValue,
        usernameSelector: username ? selectorFor(username) : undefined,
        passwordSelector: selectorFor(password),
      });
    },
  };
})();
"#;

const EXTERNAL_LINK_SHORTCUT_AGENT: &str = r#"
(() => {
  const TITLE_CHANNEL = "__KKTERM_URL_EXTERNAL_LINK__";
  const BRIDGE_TOKEN = __KKTERM_EXTERNAL_LINK_BRIDGE_TOKEN__;

  document.addEventListener("click", (event) => {
    if (!event.shiftKey || event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    let url;
    try {
      url = new URL(anchor.getAttribute("href"), window.location.href);
    } catch (_) {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    event.preventDefault();
    event.stopPropagation();
    const previousTitle = document.title;
    document.title = `${TITLE_CHANNEL}${JSON.stringify({ url: url.href, token: BRIDGE_TOKEN })}`;
    window.setTimeout(() => {
      if (document.title.startsWith(TITLE_CHANNEL)) {
        document.title = previousTitle;
      }
    }, 150);
  }, true);
})();
"#;

pub struct WebviewSessionManager {
    sessions: Mutex<HashMap<String, WebviewSession>>,
    starting_sessions: Mutex<HashSet<String>>,
    clipboard_read_allowed: Arc<AtomicBool>,
    additional_browser_args: Option<&'static str>,
}

struct WebviewSession {
    window: WebviewWindow,
    host_window: WebviewWindow,
    visible: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebviewSessionRequest {
    session_id: String,
    url: String,
    data_partition: Option<String>,
    #[serde(default)]
    ignore_certificate_errors: bool,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewSessionStarted {
    session_id: String,
    label: String,
    partition: String,
    external_link_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWebviewBoundsRequest {
    session_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetWebviewVisibilityRequest {
    session_id: String,
    visible: bool,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewNavigateRequest {
    session_id: String,
    url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewSimpleRequest {
    session_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewCaptureCredentialRequest {
    session_id: String,
    nonce: String,
}

pub(crate) struct WebviewFillCredentialRequest {
    pub(crate) session_id: String,
    pub(crate) username: String,
    pub(crate) password: String,
    pub(crate) username_selector: Option<String>,
    pub(crate) password_selector: Option<String>,
    pub(crate) field_values: Option<String>,
    pub(crate) automatic: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebviewNavigationPayload {
    session_id: String,
    url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebviewPageLoadPayload {
    session_id: String,
    url: String,
    status: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebviewTitleChangedPayload {
    session_id: String,
    title: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebviewDownloadPayload {
    session_id: String,
    url: String,
    status: &'static str,
    path: Option<String>,
    success: Option<bool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebviewNewWindowPayload {
    session_id: String,
    url: String,
}

struct StartingReservation<'a> {
    manager: &'a WebviewSessionManager,
    session_id: String,
    committed: bool,
}

impl StartingReservation<'_> {
    fn commit(mut self) {
        self.committed = true;
    }
}

impl Drop for StartingReservation<'_> {
    fn drop(&mut self) {
        if !self.committed {
            self.manager.clear_starting(&self.session_id);
        }
    }
}

impl WebviewSessionManager {
    pub fn new(allow_clipboard_read: bool, additional_browser_args: Option<&'static str>) -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            starting_sessions: Mutex::new(HashSet::new()),
            clipboard_read_allowed: Arc::new(AtomicBool::new(allow_clipboard_read)),
            additional_browser_args,
        }
    }

    pub fn set_clipboard_read_allowed(&self, allowed: bool) {
        self.clipboard_read_allowed
            .store(allowed, Ordering::Relaxed);
    }

    pub fn clipboard_read_allowed_state(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.clipboard_read_allowed)
    }

    pub fn start_session(
        &self,
        app: &AppHandle,
        request: StartWebviewSessionRequest,
    ) -> Result<WebviewSessionStarted, String> {
        let StartWebviewSessionRequest {
            session_id,
            url,
            data_partition,
            ignore_certificate_errors,
            x: _initial_x,
            y: _initial_y,
            width,
            height,
        } = request;

        let session_id = required_id(session_id)?;
        let parsed_url = parse_external_url(&url)?;
        let partition = resolve_partition(data_partition);

        {
            let sessions = self.lock()?;
            if sessions.contains_key(&session_id) {
                return Err(format!("webview session '{session_id}' is already running"));
            }
        }
        {
            let mut starting_sessions = self.lock_starting()?;
            if !starting_sessions.insert(session_id.clone()) {
                return Err(format!(
                    "webview session '{session_id}' is already starting"
                ));
            }
        }
        let starting_reservation = StartingReservation {
            manager: self,
            session_id: session_id.clone(),
            committed: false,
        };

        let host_window = app
            .get_webview_window(HOST_WINDOW_LABEL)
            .ok_or_else(|| format!("host window '{HOST_WINDOW_LABEL}' is not available"))?;

        let label = webview_label_for(&session_id);
        let navigation_app = app.clone();
        let navigation_session_id = session_id.clone();
        let page_load_app = app.clone();
        let page_load_session_id = session_id.clone();
        let title_app = app.clone();
        let title_session_id = session_id.clone();
        let download_app = app.clone();
        let download_session_id = session_id.clone();
        let new_window_app = app.clone();
        let new_window_session_id = session_id.clone();
        let initial_url = if ignore_certificate_errors && cfg!(windows) {
            parse_webview_blank_url()?
        } else {
            parsed_url.clone()
        };
        let external_link_token = external_link_bridge_token();
        let initialization_script = format!(
            "{AUTOFILL_AGENT}\n{}",
            external_link_shortcut_agent(&external_link_token)?
        );

        let mut builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(initial_url))
            .initialization_script(initialization_script)
            .decorations(false)
            .resizable(false)
            .minimizable(false)
            .closable(false)
            .skip_taskbar(true)
            .focused(false)
            .visible(false)
            .position(HIDDEN_WEBVIEW_POSITION, HIDDEN_WEBVIEW_POSITION)
            .inner_size(width.max(1.0), height.max(1.0))
            .on_navigation(move |url| {
                let _ = navigation_app.emit(
                    "webview-navigation",
                    WebviewNavigationPayload {
                        session_id: navigation_session_id.clone(),
                        url: url.to_string(),
                    },
                );
                true
            })
            .on_page_load(move |_window, payload| {
                let status = match payload.event() {
                    PageLoadEvent::Started => "started",
                    PageLoadEvent::Finished => "finished",
                };
                let _ = page_load_app.emit(
                    "webview-page-load",
                    WebviewPageLoadPayload {
                        session_id: page_load_session_id.clone(),
                        url: payload.url().to_string(),
                        status,
                    },
                );
            })
            .on_document_title_changed(move |_window, title| {
                let _ = title_app.emit(
                    "webview-title-changed",
                    WebviewTitleChangedPayload {
                        session_id: title_session_id.clone(),
                        title,
                    },
                );
            })
            .on_new_window(move |url, _features| {
                if matches!(url.scheme(), "http" | "https") {
                    let _ = new_window_app.emit(
                        "webview-new-window",
                        WebviewNewWindowPayload {
                            session_id: new_window_session_id.clone(),
                            url: url.to_string(),
                        },
                    );
                }
                NewWindowResponse::Deny
            })
            .on_download(move |_webview, event| {
                let payload = match event {
                    DownloadEvent::Requested { url, destination } => WebviewDownloadPayload {
                        session_id: download_session_id.clone(),
                        url: url.to_string(),
                        status: "requested",
                        path: Some(destination.display().to_string()),
                        success: None,
                    },
                    DownloadEvent::Finished { url, path, success } => WebviewDownloadPayload {
                        session_id: download_session_id.clone(),
                        url: url.to_string(),
                        status: "finished",
                        path: path.map(|path| path.display().to_string()),
                        success: Some(success),
                    },
                    _ => WebviewDownloadPayload {
                        session_id: download_session_id.clone(),
                        url: String::new(),
                        status: "unknown",
                        path: None,
                        success: None,
                    },
                };
                let _ = download_app.emit("webview-download", payload);
                true
            });
        builder = builder
            .owner(&host_window)
            .map_err(|error| format!("failed to assign URL webview owner: {error}"))?;
        if let Some(additional_browser_args) = self.additional_browser_args {
            builder = builder.additional_browser_args(additional_browser_args);
        }

        let window = builder
            .build()
            .map_err(|error| format!("failed to create URL webview window: {error}"))?;
        configure_clipboard_read_permission(&window, Arc::clone(&self.clipboard_read_allowed))?;
        configure_certificate_error_bypass(&window, ignore_certificate_errors)?;
        if ignore_certificate_errors && cfg!(windows) {
            window
                .navigate(parsed_url)
                .map_err(|error| format!("failed to navigate webview: {error}"))?;
        }

        let mut sessions = self.lock()?;
        sessions.insert(
            session_id.clone(),
            WebviewSession {
                window,
                host_window,
                visible: false,
            },
        );
        starting_reservation.commit();

        Ok(WebviewSessionStarted {
            session_id,
            label,
            partition,
            external_link_token,
        })
    }

    pub fn update_bounds(&self, request: UpdateWebviewBoundsRequest) -> Result<(), String> {
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        webview_debug_log(format!(
            "update_bounds session={} tracked_visible={} x={} y={} width={} height={}",
            request.session_id,
            session.visible,
            request.x,
            request.y,
            request.width,
            request.height
        ));
        if session.visible {
            show_webview(session, request.x, request.y, request.width, request.height)?;
        }
        Ok(())
    }

    pub fn set_visibility(&self, request: SetWebviewVisibilityRequest) -> Result<(), String> {
        let mut sessions = self.lock()?;
        let session = sessions
            .get_mut(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        webview_debug_log(format!(
            "set_visibility session={} visible={} x={} y={} width={} height={}",
            request.session_id,
            request.visible,
            request.x,
            request.y,
            request.width,
            request.height
        ));
        if request.visible {
            show_webview(session, request.x, request.y, request.width, request.height)?;
            session.visible = true;
        } else {
            hide_webview(&session.window)?;
            session.visible = false;
        }
        Ok(())
    }

    pub fn focus(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        if !session.visible {
            return Ok(());
        }
        session
            .window
            .set_focus()
            .map_err(|error| format!("failed to focus webview: {error}"))
    }

    pub fn navigate(&self, request: WebviewNavigateRequest) -> Result<(), String> {
        let url = parse_external_url(&request.url)?;
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .navigate(url)
            .map_err(|error| format!("failed to navigate webview: {error}"))
    }

    pub fn reload(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .reload()
            .map_err(|error| format!("failed to reload webview: {error}"))
    }

    pub fn go_back(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .eval("window.history.back();")
            .map_err(|error| format!("failed to navigate webview back: {error}"))
    }

    pub fn go_forward(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .eval("window.history.forward();")
            .map_err(|error| format!("failed to navigate webview forward: {error}"))
    }

    pub(crate) fn fill_credential(
        &self,
        request: WebviewFillCredentialRequest,
    ) -> Result<(), String> {
        let payload = serde_json::json!({
            "username": request.username,
            "password": request.password,
            "usernameSelector": request.username_selector,
            "passwordSelector": request.password_selector,
            "fieldValues": request.field_values,
            "automatic": request.automatic,
        });
        let payload = serde_json::to_string(&payload)
            .map_err(|error| format!("failed to prepare URL credential payload: {error}"))?;
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .eval(format!("window.__KKTERM_URL_AUTOFILL__?.fill({payload});"))
            .map_err(|error| format!("failed to fill webview credential: {error}"))
    }

    pub fn capture_credential(
        &self,
        request: WebviewCaptureCredentialRequest,
    ) -> Result<(), String> {
        let nonce = serde_json::to_string(&request.nonce)
            .map_err(|error| format!("failed to prepare URL credential capture nonce: {error}"))?;
        let sessions = self.lock()?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| format!("webview session '{}' was not found", request.session_id))?;
        session
            .window
            .eval(format!("window.__KKTERM_URL_AUTOFILL__?.capture({nonce});"))
            .map_err(|error| format!("failed to capture webview credential: {error}"))
    }

    pub fn close_session(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        let mut sessions = self.lock()?;
        if let Some(session) = sessions.remove(&request.session_id) {
            session
                .window
                .close()
                .map_err(|error| format!("failed to close webview: {error}"))?;
        }
        Ok(())
    }

    fn lock(&self) -> Result<MutexGuard<'_, HashMap<String, WebviewSession>>, String> {
        self.sessions
            .lock()
            .map_err(|_| "webview session lock is poisoned".to_string())
    }

    fn lock_starting(&self) -> Result<MutexGuard<'_, HashSet<String>>, String> {
        self.starting_sessions
            .lock()
            .map_err(|_| "webview startup lock is poisoned".to_string())
    }

    fn clear_starting(&self, session_id: &str) {
        if let Ok(mut starting_sessions) = self.starting_sessions.lock() {
            starting_sessions.remove(session_id);
        }
    }
}

fn webview_label_for(session_id: &str) -> String {
    format!("url-session-{session_id}")
}

fn show_webview(
    session: &WebviewSession,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let (position, size) = overlay_rect(&session.host_window, x, y, width, height)?;
    session
        .window
        .set_position(Position::Physical(position))
        .map_err(|error| format!("failed to position webview: {error}"))?;
    session
        .window
        .set_size(Size::Physical(size))
        .map_err(|error| format!("failed to size webview: {error}"))?;
    show_webview_window(&session.window)
}

fn hide_webview(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_position(Position::Physical(PhysicalPosition::new(-32_000, -32_000)))
        .map_err(|error| format!("failed to hide webview: {error}"))?;
    window
        .set_size(Size::Physical(PhysicalSize::new(1, 1)))
        .map_err(|error| format!("failed to hide webview: {error}"))?;
    window
        .hide()
        .map_err(|error| format!("failed to hide webview: {error}"))
}

fn overlay_rect(
    host_window: &WebviewWindow,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(PhysicalPosition<i32>, PhysicalSize<u32>), String> {
    let scale_factor = host_window
        .scale_factor()
        .map_err(|error| format!("failed to read host window scale factor: {error}"))?;
    let host_origin = host_window
        .inner_position()
        .map_err(|error| format!("failed to read host window content position: {error}"))?;
    let left = host_origin.x + (x.max(0.0) * scale_factor).round() as i32;
    let top = host_origin.y + (y.max(0.0) * scale_factor).round() as i32;
    let width = (width.max(1.0) * scale_factor).round().max(1.0) as u32;
    let height = (height.max(1.0) * scale_factor).round().max(1.0) as u32;
    Ok((
        PhysicalPosition::new(left, top),
        PhysicalSize::new(width, height),
    ))
}

#[cfg(target_os = "windows")]
fn show_webview_window(window: &WebviewWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SW_SHOWNOACTIVATE, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SetWindowPos,
        ShowWindow,
    };

    let hwnd = match window.hwnd() {
        Ok(hwnd) => hwnd,
        Err(_) => {
            window
                .show()
                .map_err(|error| format!("failed to realize URL webview window: {error}"))?;
            window
                .hwnd()
                .map_err(|error| format!("failed to get URL webview HWND after realize: {error}"))?
        }
    };
    unsafe {
        SetWindowPos(
            HWND(hwnd.0),
            None,
            0,
            0,
            0,
            0,
            SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER,
        )
        .map_err(|error| format!("failed to show webview without activation: {error}"))?;
        let _ = ShowWindow(HWND(hwnd.0), SW_SHOWNOACTIVATE);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn show_webview_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .show()
        .map_err(|error| format!("failed to show webview: {error}"))
}

fn webview_debug_log(message: String) {
    if std::env::var("KKTERM_WEBVIEW_DEBUG").ok().as_deref() == Some("1") {
        eprintln!("[kkterm:webview] {message}");
    }
}

fn configure_certificate_error_bypass(
    webview: &WebviewWindow,
    enabled: bool,
) -> Result<(), String> {
    if !enabled {
        return Ok(());
    }
    configure_platform_certificate_error_bypass(webview)
}

pub(crate) fn configure_shell_clipboard_read_permission(
    webview: &tauri::WebviewWindow,
    allowed: Arc<AtomicBool>,
) -> Result<(), String> {
    configure_webview2_clipboard_permission(webview, allowed)
}

fn configure_clipboard_read_permission(
    webview: &WebviewWindow,
    allowed: Arc<AtomicBool>,
) -> Result<(), String> {
    configure_webview2_clipboard_permission(webview, allowed)
}

#[cfg(windows)]
fn configure_webview2_clipboard_permission(
    webview: &WebviewWindow,
    allowed: Arc<AtomicBool>,
) -> Result<(), String> {
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{
            COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ, COREWEBVIEW2_PERMISSION_STATE_ALLOW,
            ICoreWebView2PermissionRequestedEventArgs2,
        },
        PermissionRequestedEventHandler,
    };
    use windows_core::Interface;

    let setup_error = Arc::new(Mutex::new(None::<String>));
    let setup_error_for_callback = Arc::clone(&setup_error);

    webview
        .with_webview(move |platform_webview| {
            let result = (|| -> Result<(), String> {
                unsafe {
                    let webview2 = platform_webview
                        .controller()
                        .CoreWebView2()
                        .map_err(|error| error.to_string())?;
                    let handler =
                        PermissionRequestedEventHandler::create(Box::new(move |_sender, args| {
                            if let Some(args) = args {
                                let mut permission_kind =
                                    COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ;
                                args.PermissionKind(&mut permission_kind)?;
                                if permission_kind == COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ {
                                    if allowed.load(Ordering::Relaxed) {
                                        args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
                                    }
                                    if let Ok(args2) =
                                        args.cast::<ICoreWebView2PermissionRequestedEventArgs2>()
                                    {
                                        args2.SetHandled(true)?;
                                    }
                                }
                            }
                            Ok(())
                        }));
                    let mut token = 0;
                    webview2
                        .add_PermissionRequested(&handler, &mut token)
                        .map_err(|error| error.to_string())?;
                }
                Ok::<(), String>(())
            })();
            if let Err(error) = result {
                if let Ok(mut setup_error) = setup_error_for_callback.lock() {
                    *setup_error = Some(error);
                }
            }
        })
        .map_err(|error| format!("failed to access WebView2 for clipboard settings: {error}"))?;

    if let Ok(mut setup_error) = setup_error.lock() {
        if let Some(error) = setup_error.take() {
            return Err(format!(
                "failed to configure clipboard paste permission for WebView2: {error}"
            ));
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn configure_webview2_clipboard_permission(
    _webview: &WebviewWindow,
    _allowed: Arc<AtomicBool>,
) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn configure_platform_certificate_error_bypass(webview: &WebviewWindow) -> Result<(), String> {
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{
            COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_ALWAYS_ALLOW, ICoreWebView2_14,
        },
        ServerCertificateErrorDetectedEventHandler,
    };
    use windows_core::Interface;

    let setup_error = Arc::new(Mutex::new(None::<String>));
    let setup_error_for_callback = Arc::clone(&setup_error);

    webview
        .with_webview(move |platform_webview| {
            let result = (|| -> Result<(), String> {
                unsafe {
                    let webview2 = platform_webview
                        .controller()
                        .CoreWebView2()
                        .map_err(|error| error.to_string())?;
                    let webview2 = webview2
                        .cast::<ICoreWebView2_14>()
                        .map_err(|error| error.to_string())?;
                    let handler = ServerCertificateErrorDetectedEventHandler::create(Box::new(
                        move |_sender, args| {
                            if let Some(args) = args {
                                args.SetAction(
                                    COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_ALWAYS_ALLOW,
                                )?;
                            }
                            Ok(())
                        },
                    ));
                    let mut token = 0;
                    webview2
                        .add_ServerCertificateErrorDetected(&handler, &mut token)
                        .map_err(|error| error.to_string())?;
                }
                Ok::<(), String>(())
            })();
            if let Err(error) = result {
                if let Ok(mut setup_error) = setup_error_for_callback.lock() {
                    *setup_error = Some(error);
                }
            }
        })
        .map_err(|error| format!("failed to access WebView2 for certificate settings: {error}"))?;

    if let Ok(mut setup_error) = setup_error.lock() {
        if let Some(error) = setup_error.take() {
            return Err(format!(
                "failed to enable URL certificate bypass for WebView2: {error}"
            ));
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn configure_platform_certificate_error_bypass(_webview: &WebviewWindow) -> Result<(), String> {
    Ok(())
}

fn required_id(value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("webview session id is required".to_string());
    }
    if trimmed.len() > 96 {
        return Err("webview session id must be 96 characters or fewer".to_string());
    }
    if !trimmed
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("webview session id may only contain letters, digits, '-' or '_'".to_string());
    }
    Ok(trimmed.to_string())
}

fn parse_webview_blank_url() -> Result<url::Url, String> {
    url::Url::parse("about:blank").map_err(|error| format!("blank URL is not valid: {error}"))
}

fn parse_external_url(value: &str) -> Result<url::Url, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("URL is required".to_string());
    }
    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let parsed =
        url::Url::parse(&candidate).map_err(|error| format!("URL is not valid: {error}"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed),
        other => Err(format!("URL scheme must be http or https, got {other}")),
    }
}

fn resolve_partition(data_partition: Option<String>) -> String {
    data_partition
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_PARTITION.to_string())
}

fn external_link_bridge_token() -> String {
    let mut random = [0_u8; 16];
    rand::rng().fill_bytes(&mut random);
    random
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>()
}

fn external_link_shortcut_agent(token: &str) -> Result<String, String> {
    let token = serde_json::to_string(token)
        .map_err(|error| format!("failed to prepare URL external-link token: {error}"))?;
    Ok(EXTERNAL_LINK_SHORTCUT_AGENT.replace("__KKTERM_EXTERNAL_LINK_BRIDGE_TOKEN__", &token))
}
