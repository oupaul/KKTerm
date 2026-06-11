//! macOS RDP client built on IronRDP. Decodes the RDP framebuffer to RGBA and
//! emits `rdp-canvas-event`s for the workspace canvas. Windows uses the native
//! ActiveX path in `rdp.rs` instead; this module is compiled only off-Windows.
//!
//! # Pinned IronRDP connect sequence (verified against ironrdp 0.15 / ironrdp-tokio 0.9)
//!
//! ## Dependencies used
//! - `ironrdp = "0.15"` with features `["connector", "session", "graphics", "pdu", "input"]`
//! - `ironrdp-tokio = "0.9"` (re-exports all of `ironrdp_async` via `pub use ironrdp_async::*`)
//! - `tokio-rustls = "0.26"` (for TLS upgrade — we implement the upgrade directly, no ironrdp-tls)
//! - `sspi = "0.21"` (for CredSSP/NTLM)
//!
//! ## Key types
//! ```text
//! // TokioFramed<S> = Framed<TokioStream<S>>
//! // Framed::new(stream: S::InnerStream) -> Self
//! // TokioStream<S>::InnerStream = S  =>  TokioFramed::new(tcp_stream) works directly
//! ironrdp_tokio::TokioFramed<tokio::net::TcpStream>
//! ironrdp_tokio::TokioFramed<Box<dyn AsyncReadWrite + Unpin + Send + Sync>>
//! ironrdp::connector::ClientConnector  // config: connector::Config, client_addr: SocketAddr
//! ironrdp::connector::ConnectionResult  // returned by connect_finalize on success
//! ```
//!
//! ## Connect sequence (exact function paths, all from ironrdp_tokio namespace)
//! ```text
//! // Step 1: TCP connect + create framed
//! let stream = tokio::net::TcpStream::connect((host, port)).await?;
//! let client_addr = stream.local_addr()?;
//! let mut framed = ironrdp_tokio::TokioFramed::new(stream);
//!
//! // Step 2: Create connector
//! let mut connector = ironrdp::connector::ClientConnector::new(config, client_addr);
//!
//! // Step 3: Begin connection (negotiation / NLA pre-TLS handshake)
//! // Signature: pub async fn connect_begin<S>(framed: &mut Framed<S>, connector: &mut ClientConnector)
//! //            -> ConnectorResult<ShouldUpgrade>
//! //            where S: Sync + FramedRead + FramedWrite
//! let should_upgrade = ironrdp_tokio::connect_begin(&mut framed, &mut connector).await?;
//!
//! // Step 4: Extract inner TCP stream + any leftover bytes
//! // Framed::into_inner(self) -> (S::InnerStream, BytesMut)
//! // Here S = TokioStream<TcpStream>, so InnerStream = TcpStream
//! let (initial_stream, leftover_bytes) = framed.into_inner();
//!
//! // Step 5: TLS upgrade via tokio-rustls (no-verify config for RDP, matching ironrdp-tls pattern)
//! // Build a rustls ClientConfig with a NoCertificateVerification verifier (required for RDP).
//! // Disable TLS resumption (CredSSP does not support TLS session resumption).
//! // connect: tokio_rustls::TlsConnector::from(Arc::new(config)).connect(domain, stream).await?
//! // type: tokio_rustls::client::TlsStream<TcpStream>
//! let tls_stream: tokio_rustls::client::TlsStream<TcpStream> = /* TLS handshake */;
//!
//! // Step 6: Extract server public key (SubjectPublicKey bytes from peer cert SPKI)
//! // From tls_stream.get_ref().1.peer_certificates() -> &[CertificateDer<'_>]
//! // Take first cert, parse as x509_cert::Certificate (via x509_cert::der::Decode),
//! // then: cert.tbs_certificate.subject_public_key_info.subject_public_key.as_bytes()
//! // The connect_finalize parameter type is Vec<u8>.
//! let server_public_key: Vec<u8> = /* extract from tls_stream peer cert SPKI */;
//!
//! // Step 7: Mark as upgraded
//! // Signature: pub fn mark_as_upgraded(should_upgrade: ShouldUpgrade, connector: &mut ClientConnector)
//! //            -> Upgraded
//! let upgraded = ironrdp_tokio::mark_as_upgraded(should_upgrade, &mut connector);
//!
//! // Step 8: Create upgraded framed (box-erased TLS stream; reuse leftover bytes)
//! let erased: Box<dyn AsyncReadWrite + Unpin + Send + Sync> = Box::new(tls_stream);
//! let mut upgraded_framed = ironrdp_tokio::TokioFramed::new_with_leftover(erased, leftover_bytes);
//!
//! // Step 9: Finalize connection (CredSSP / capability negotiation)
//! // Signature: pub async fn connect_finalize<S, N>(
//! //     _: Upgraded,
//! //     connector: ClientConnector,         // consumed (not &mut)
//! //     framed: &mut Framed<S>,
//! //     network_client: &mut N,
//! //     server_name: ServerName,            // ironrdp::connector::ServerName (wraps &str / String)
//! //     server_public_key: Vec<u8>,
//! //     kerberos_config: Option<KerberosConfig>,
//! // ) -> ConnectorResult<ConnectionResult>
//! // where S: FramedRead + FramedWrite, N: NetworkClient
//! //
//! // NetworkClient trait (not dyn-compatible):
//! //   fn send(&mut self, request: &NetworkRequest) -> impl Future<Output=ConnectorResult<Vec<u8>>>
//! //
//! // For NTLM (username/password) there is NO Kerberos KDC round-trip, so a no-op NetworkClient
//! // is acceptable. A unit struct implementing NetworkClient that panics / returns error on send
//! // is sufficient. Pass kerberos_config = None.
//! //
//! // ironrdp_tokio::reqwest::ReqwestNetworkClient (requires "reqwest" feature on ironrdp-tokio)
//! // is the provided implementation but adds a large dep. A manual no-op struct works for NTLM.
//! let connection_result = ironrdp_tokio::connect_finalize(
//!     upgraded,
//!     connector,
//!     &mut upgraded_framed,
//!     &mut NoopNetworkClient,    // safe for NTLM; panics if Kerberos KDC round-trip is needed
//!     server_name.into(),
//!     server_public_key,
//!     None,                      // kerberos_config
//! ).await?;
//!
//! // Step 10: Active session loop
//! // ironrdp::session::ActiveStage::new(connection_result)
//! // upgraded_framed is now the session transport
//! ```
//!
//! ## NoopNetworkClient implementation sketch (for Task 4)
//! ```rust,ignore
//! struct NoopNetworkClient;
//! impl ironrdp_tokio::NetworkClient for NoopNetworkClient {
//!     async fn send(&mut self, _: &ironrdp_tokio::NetworkRequest) -> ironrdp_tokio::ConnectorResult<Vec<u8>> {
//!         Err(ironrdp::connector::general_err!("no KDC network client; use NTLM not Kerberos"))
//!     }
//! }
//! ```
//!
//! ## CredSSP / NTLM via sspi
//! The connector internally calls sspi for NTLMv2 when `ironrdp::connector::Config` is set up
//! with username/password credentials. The `sspi = "0.21"` dep provides the NTLM implementation.
//! No explicit sspi calls needed at the connect-sequence level; the connector drives it.

// Implemented in later tasks.

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
};
use tauri::{AppHandle, Emitter};
use tokio::{
    runtime::Runtime,
    sync::{mpsc, oneshot},
};

const DEFAULT_RDP_PORT: u16 = 3389;
const DEFAULT_RDP_WIDTH: u16 = 1280;
const DEFAULT_RDP_HEIGHT: u16 = 800;

pub struct RdpClientSessionManager {
    runtime: Runtime,
    sessions: Mutex<HashMap<String, RdpClientSession>>,
}

struct RdpClientSession {
    input: mpsc::UnboundedSender<RdpInput>,
    stop: Option<oneshot::Sender<()>>,
    connected: bool,
}

/// Input operations queued from the frontend, translated to IronRDP input in
/// the event loop (Task 4/5).
enum RdpInput {
    Pointer { x: u16, y: u16, button_mask: u8 },
    Key { scancode: u16, down: bool },
    CtrlAltDelete,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRdpClientSessionRequest {
    session_id: String,
    host: String,
    port: Option<u16>,
    username: String,
    #[serde(default)]
    domain: Option<String>,
    secret_owner_id: Option<String>,
    password: Option<String>,
    #[serde(default)]
    desktop_width: Option<u16>,
    #[serde(default)]
    desktop_height: Option<u16>,
}

impl StartRdpClientSessionRequest {
    fn desktop_width(&self) -> u16 {
        self.desktop_width.filter(|v| *v > 0).unwrap_or(DEFAULT_RDP_WIDTH)
    }
    fn desktop_height(&self) -> u16 {
        self.desktop_height.filter(|v| *v > 0).unwrap_or(DEFAULT_RDP_HEIGHT)
    }
    pub(crate) fn secret_owner_id(&self) -> Option<&str> {
        self.secret_owner_id.as_deref().map(str::trim).filter(|v| !v.is_empty())
    }
    pub(crate) fn password(&self) -> Option<&str> {
        self.password.as_deref().filter(|v| !v.is_empty())
    }
    pub(crate) fn set_password(&mut self, password: Option<String>) {
        self.password = password;
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientSessionStarted {
    session_id: String,
    host: String,
    port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientSessionStatus {
    session_id: String,
    connected: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientPointerEventRequest {
    session_id: String,
    x: u16,
    y: u16,
    button_mask: u8,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientKeyEventRequest {
    session_id: String,
    scancode: u16,
    down: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientSimpleRequest {
    session_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "kind")]
enum RdpCanvasEvent {
    Connected { session_id: String, name: String },
    Resolution { session_id: String, width: u16, height: u16 },
    RawImage { session_id: String, x: u16, y: u16, width: u16, height: u16, rgba: String },
    SetCursor { session_id: String, width: u16, height: u16, hot_x: u16, hot_y: u16, rgba: String },
    Error { session_id: String, message: String },
    Disconnected { session_id: String },
}

impl RdpClientSessionManager {
    pub fn new() -> Self {
        Self {
            runtime: Runtime::new().expect("RDP client runtime initializes"),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    fn lock_sessions(&self) -> Result<MutexGuard<'_, HashMap<String, RdpClientSession>>, String> {
        self.sessions.lock().map_err(|_| "RDP session lock is poisoned".to_string())
    }
}

fn emit_rdp_event(app: &AppHandle, event: RdpCanvasEvent) {
    let _ = app.emit("rdp-canvas-event", event);
}

fn required_id(value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("RDP session id is required".to_string());
    }
    if trimmed.len() > 96 {
        return Err("RDP session id must be 96 characters or fewer".to_string());
    }
    if !trimmed.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_')) {
        return Err("RDP session id may only contain letters, digits, '-' or '_'".to_string());
    }
    Ok(trimmed.to_string())
}

/// Copy the `(x, y, w, h)` sub-rectangle out of a full-frame RGBA buffer
/// (`stride = full_width * 4`) into a tightly packed RGBA buffer.
fn extract_rgba_rect(
    full_rgba: &[u8],
    full_width: u16,
    x: u16,
    y: u16,
    w: u16,
    h: u16,
) -> Vec<u8> {
    let stride = full_width as usize * 4;
    let mut out = Vec::with_capacity(w as usize * h as usize * 4);
    for row in 0..h as usize {
        let src_y = y as usize + row;
        let start = src_y * stride + x as usize * 4;
        let end = start + w as usize * 4;
        if end <= full_rgba.len() {
            out.extend_from_slice(&full_rgba[start..end]);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_session_ids() {
        assert_eq!(required_id("rdp-1".to_string()).as_deref(), Ok("rdp-1"));
        assert!(required_id("bad/session".to_string()).is_err());
    }

    #[test]
    fn start_request_deserializes_with_defaults() {
        let json = r#"{"sessionId":"rdp-1","host":"win.local","username":"u","password":"p"}"#;
        let request: StartRdpClientSessionRequest =
            serde_json::from_str(json).expect("request deserializes");
        assert_eq!(request.host, "win.local");
        assert!(request.domain.is_none());
        assert_eq!(request.desktop_width(), DEFAULT_RDP_WIDTH);
        assert_eq!(request.desktop_height(), DEFAULT_RDP_HEIGHT);
    }

    #[test]
    fn extracts_rgba_rect_from_framebuffer() {
        // 2x2 RGBA image, extract the bottom-right 1x1 pixel.
        let width = 2u16;
        let full = vec![
            0, 0, 0, 255,        1, 1, 1, 255,
            2, 2, 2, 255,        3, 3, 3, 255,
        ];
        let rect = extract_rgba_rect(&full, width, 1, 1, 1, 1);
        assert_eq!(rect, vec![3, 3, 3, 255]);
    }
}
