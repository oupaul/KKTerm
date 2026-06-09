//! Embedded URL-browser backend — STUBBED.
//!
//! KKTerm previously embedded the "URL / webview" connection type as a child
//! webview (`Window::add_child`), which required Tauri's `unstable` feature. That
//! feature globally switches every webview — including the main terminal webview —
//! from `build()` (window content) to `build_as_child()` (a child HWND). wry only
//! installs its `WM_SETFOCUS` focus-forwarding subclass for window-content
//! webviews (`attach_parent_subclass`, gated on `!is_child`), so as a child HWND
//! the terminal lost keyboard focus on alt-tab until a click.
//!
//! The in-app browser is a nice-to-have, so we dropped `unstable` and stubbed the
//! embedded path: `start_session` opens the URL in the user's default browser and
//! the remaining session commands are no-ops. This restores native focus
//! forwarding for the terminal with no native focus code. The public API surface
//! and the main-window WebView2 clipboard-permission helper are preserved so the
//! rest of the app and the command handlers compile unchanged.

use std::{
    collections::HashSet,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const DEFAULT_PARTITION: &str = "shared";

/// WebView2 browser arguments that keep the renderer alive across RDP session
/// disconnect/reconnect. Passed to the main window's webview at startup; see the
/// call site in `lib.rs`. Retained here as the shared owner of the constant.
#[cfg(target_os = "windows")]
pub(crate) const REMOTE_SESSION_WEBVIEW2_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion --disable-gpu";

pub struct WebviewSessionManager {
    clipboard_read_allowed: Arc<AtomicBool>,
    /// Session ids already routed to the external browser, so repeated frontend
    /// start attempts for the same pane do not reopen the browser each time.
    externally_opened: Mutex<HashSet<String>>,
    #[allow(dead_code)]
    additional_browser_args: Option<&'static str>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartWebviewSessionRequest {
    session_id: String,
    url: String,
    #[allow(dead_code)]
    data_partition: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    ignore_certificate_errors: bool,
    #[allow(dead_code)]
    x: f64,
    #[allow(dead_code)]
    y: f64,
    #[allow(dead_code)]
    width: f64,
    #[allow(dead_code)]
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
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    x: f64,
    #[allow(dead_code)]
    y: f64,
    #[allow(dead_code)]
    width: f64,
    #[allow(dead_code)]
    height: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetWebviewVisibilityRequest {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    visible: bool,
    #[allow(dead_code)]
    x: f64,
    #[allow(dead_code)]
    y: f64,
    #[allow(dead_code)]
    width: f64,
    #[allow(dead_code)]
    height: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewNavigateRequest {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewSimpleRequest {
    #[allow(dead_code)]
    session_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewCaptureCredentialRequest {
    #[allow(dead_code)]
    session_id: String,
    #[allow(dead_code)]
    nonce: String,
}

pub(crate) struct WebviewFillCredentialRequest {
    #[allow(dead_code)]
    pub(crate) session_id: String,
    #[allow(dead_code)]
    pub(crate) username: String,
    #[allow(dead_code)]
    pub(crate) password: String,
    #[allow(dead_code)]
    pub(crate) username_selector: Option<String>,
    #[allow(dead_code)]
    pub(crate) password_selector: Option<String>,
    #[allow(dead_code)]
    pub(crate) field_values: Option<String>,
    #[allow(dead_code)]
    pub(crate) automatic: bool,
}

impl WebviewSessionManager {
    pub fn new(allow_clipboard_read: bool, additional_browser_args: Option<&'static str>) -> Self {
        Self {
            clipboard_read_allowed: Arc::new(AtomicBool::new(allow_clipboard_read)),
            externally_opened: Mutex::new(HashSet::new()),
            additional_browser_args,
        }
    }

    pub fn set_clipboard_read_allowed(&self, allowed: bool) {
        self.clipboard_read_allowed.store(allowed, Ordering::Relaxed);
    }

    pub fn clipboard_read_allowed_state(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.clipboard_read_allowed)
    }

    /// Embedded browsing is disabled. Open the URL in the user's default browser
    /// (once per session id) and report that nothing was embedded.
    pub fn start_session(
        &self,
        app: &AppHandle,
        request: StartWebviewSessionRequest,
    ) -> Result<WebviewSessionStarted, String> {
        let session_id = required_id(request.session_id)?;
        let url = parse_external_url(&request.url)?;

        let already_opened = self
            .externally_opened
            .lock()
            .map(|mut set| !set.insert(session_id.clone()))
            .unwrap_or(false);
        if !already_opened {
            app.opener()
                .open_url(url.to_string(), None::<&str>)
                .map_err(|error| format!("failed to open URL in external browser: {error}"))?;
        }

        Err("The in-app browser is disabled in this build; the URL opened in your default browser.".to_string())
    }

    pub fn update_bounds(&self, _request: UpdateWebviewBoundsRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn set_visibility(&self, _request: SetWebviewVisibilityRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn focus(&self, _request: WebviewSimpleRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn navigate(&self, _request: WebviewNavigateRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn reload(&self, _request: WebviewSimpleRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn go_back(&self, _request: WebviewSimpleRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn go_forward(&self, _request: WebviewSimpleRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn fill_credential(&self, _request: WebviewFillCredentialRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn capture_credential(&self, _request: WebviewCaptureCredentialRequest) -> Result<(), String> {
        Ok(())
    }

    pub fn close_session(&self, request: WebviewSimpleRequest) -> Result<(), String> {
        if let Ok(mut set) = self.externally_opened.lock() {
            set.remove(&request.session_id);
        }
        Ok(())
    }
}

/// Allow the main terminal webview to read the clipboard without per-paste
/// prompts. Operates on the window-content `WebviewWindow` (no `unstable` needed).
pub(crate) fn configure_shell_clipboard_read_permission(
    webview: &tauri::WebviewWindow,
    allowed: Arc<AtomicBool>,
) -> Result<(), String> {
    configure_platform_shell_clipboard_read_permission(webview, allowed)
}

#[cfg(windows)]
fn configure_platform_shell_clipboard_read_permission(
    webview: &tauri::WebviewWindow,
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
                                let mut permission_kind = COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ;
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
fn configure_platform_shell_clipboard_read_permission(
    _webview: &tauri::WebviewWindow,
    _allowed: Arc<AtomicBool>,
) -> Result<(), String> {
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
    let parsed = url::Url::parse(&candidate).map_err(|error| format!("URL is not valid: {error}"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed),
        other => Err(format!("URL scheme must be http or https, got {other}")),
    }
}

#[allow(dead_code)]
fn resolve_partition(data_partition: Option<String>) -> String {
    data_partition
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_PARTITION.to_string())
}
