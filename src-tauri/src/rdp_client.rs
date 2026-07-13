//! macOS RDP client built on IronRDP. Decodes the RDP framebuffer to RGBA and
//! emits `rdp-canvas-event`s for the workspace canvas. Windows uses the native
//! ActiveX path in `rdp.rs` instead; this module is compiled only off-Windows.
//!
//! # Pinned IronRDP connect sequence (verified against ironrdp 0.16 / ironrdp-tokio 0.9)
//!
//! ## Dependencies used
//! - `ironrdp = "0.16"` with features `["connector", "session", "graphics", "pdu", "input"]`
//! - `ironrdp-tokio = "0.9"` (re-exports all of `ironrdp_async` via `pub use ironrdp_async::*`)
//! - `openssl = "0.10"` (vendored) + `tokio-openssl = "0.6"` (for the TLS upgrade; see
//!   `tls_upgrade`). Both rustls and native-tls (macOS Secure Transport) refuse the
//!   legacy cipher suites (TLS 1.0, RSA key-exchange/CBC-SHA) that old Windows RDP
//!   hosts (Windows Server 2008 R2 and earlier) offer; OpenSSL at SECLEVEL=0
//!   negotiates them the same way the official Microsoft RDP client does.
//! - `sspi = "0.21"` (for CredSSP/NTLM)
//!
//! ## Key types
//! ```text
//! // TokioFramed<S> = Framed<TokioStream<S>>
//! // Framed::new(stream: S::InnerStream) -> Self
//! // TokioStream<S>::InnerStream = S  =>  TokioFramed::new(tcp_stream) works directly
//! ironrdp_tokio::TokioFramed<tokio::net::TcpStream>                     // pre-TLS
//! ironrdp_tokio::TokioFramed<tokio_openssl::SslStream<TcpStream>>       // post-TLS (concrete; see UpgradedFramed)
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
//! let should_upgrade = ironrdp_tokio::connect_begin(&mut framed, &mut connector).await?;
//!
//! // Step 4: Extract inner TCP stream + any leftover bytes
//! let (initial_stream, leftover_bytes) = framed.into_inner();
//!
//! // Step 5: TLS upgrade via OpenSSL (see tls_upgrade).
//! let tls_stream = tls_upgrade(initial_stream, &host).await?;
//!
//! // Step 6: Extract the server certificate's public key and RFC 5929 channel
//! // binding token (see extract_server_public_key), both bound into CredSSP.
//! let server_cert_data = extract_server_public_key(&tls_stream)?;
//!
//! // Step 7: Mark as upgraded
//! let upgraded = ironrdp_tokio::mark_as_upgraded(should_upgrade, &mut connector);
//!
//! // Step 8: Create upgraded framed over the concrete TLS stream (kept concrete,
//! // not box-erased, so the spawned session future stays `Send`).
//! let mut upgraded_framed = ironrdp_tokio::TokioFramed::new_with_leftover(tls_stream, leftover_bytes);
//!
//! // Step 9: Finalize connection
//! let connection_result = ironrdp_tokio::connect_finalize_with_channel_bindings(
//!     upgraded, connector, &mut upgraded_framed, &mut NoopNetworkClient,
//!     ServerName::new(host), server_cert_data.subject_public_key, None,
//!     Some(server_cert_data.channel_binding_token),
//! ).await?;
//! ```

use crate::logging::rdp_debug;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use ironrdp::cliprdr::{
    CliprdrClient,
    backend::{ClipboardMessage, ClipboardMessageProxy, CliprdrBackend},
    pdu::{
        ClipboardFormat, ClipboardFormatId, ClipboardGeneralCapabilityFlags, FileContentsRequest,
        FileContentsResponse, FormatDataRequest, FormatDataResponse, LockDataId,
        OwnedFormatDataResponse,
    },
};
use ironrdp::core::{AsAny, IntoOwned};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
};
use tauri::{AppHandle, Emitter};
use tokio::{
    net::TcpStream,
    runtime::Runtime,
    sync::{mpsc, oneshot},
};

const DEFAULT_RDP_PORT: u16 = 3389;
const DEFAULT_RDP_WIDTH: u16 = 1280;
const DEFAULT_RDP_HEIGHT: u16 = 800;

// ── Session manager ───────────────────────────────────────────────────────────

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
    Pointer {
        x: u16,
        y: u16,
        button_mask: u8,
    },
    Key {
        scancode: u16,
        down: bool,
    },
    /// Composed text (IME / printable characters) sent as RDP Unicode keyboard
    /// events — layout- and IME-independent, unlike scancodes.
    Text(String),
    LocalClipboardText(String),
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
    #[serde(default)]
    ignore_tls_errors: bool,
}

impl StartRdpClientSessionRequest {
    fn desktop_width(&self) -> u16 {
        self.desktop_width
            .filter(|v| *v > 0)
            .unwrap_or(DEFAULT_RDP_WIDTH)
    }
    fn desktop_height(&self) -> u16 {
        self.desktop_height
            .filter(|v| *v > 0)
            .unwrap_or(DEFAULT_RDP_HEIGHT)
    }
    pub(crate) fn secret_owner_id(&self) -> Option<&str> {
        self.secret_owner_id
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
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
pub struct RdpClientTextRequest {
    session_id: String,
    text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RdpClientSimpleRequest {
    session_id: String,
}

#[derive(Clone, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "kind"
)]
enum RdpCanvasEvent {
    Connected {
        session_id: String,
        name: String,
    },
    Resolution {
        session_id: String,
        width: u16,
        height: u16,
    },
    RawImage {
        session_id: String,
        x: u16,
        y: u16,
        width: u16,
        height: u16,
        rgba: String,
    },
    SetCursor {
        session_id: String,
        width: u16,
        height: u16,
        hot_x: u16,
        hot_y: u16,
        rgba: String,
    },
    Error {
        session_id: String,
        message: String,
    },
    Disconnected {
        session_id: String,
    },
    ClipboardText {
        session_id: String,
        text: String,
    },
}

/// Diagnostic sink for [`ironrdp::session::set_slow_path_bitmap_diagnostic_hook`],
/// tracking down ghosting/misplaced-tile rendering against legacy hosts that
/// lean heavily on slow-path (X224) bitmap updates. Logs each `TS_BITMAP_DATA`
/// rectangle's wire-encoded bounds/dimensions before it reaches the shared
/// bitmap-apply pipeline, so a corrupted screen can be cross-checked against
/// exactly what tiles the server described and where it placed them.
fn log_slow_path_bitmap_tile(
    left: u16,
    top: u16,
    right: u16,
    bottom: u16,
    width: u16,
    height: u16,
    bits_per_pixel: u16,
    compressed: bool,
    data_len: usize,
) {
    rdp_debug(
        "ironrdp.slow_path_tile",
        &json!({
            "left": left,
            "top": top,
            "right": right,
            "bottom": bottom,
            "rectWidth": right.saturating_sub(left).saturating_add(1),
            "rectHeight": bottom.saturating_sub(top).saturating_add(1),
            "width": width,
            "height": height,
            "bitsPerPixel": bits_per_pixel,
            "compressed": compressed,
            "dataLen": data_len,
        }),
    );
}

/// Diagnostic sink for [`ironrdp::session::set_slow_path_unhandled_update_diagnostic_hook`].
/// Fires when the server sends a slow-path drawing-orders or palette update,
/// which this client does not apply to the framebuffer. If a server relies on
/// orders (e.g. ScrBlt/MemBlt for scrolling or window moves) instead of
/// re-sending bitmap updates, those screen changes are silently dropped here,
/// which would show up as leftover/"ghosted" content.
fn log_slow_path_unhandled_update(kind: &'static str, data_len: usize) {
    rdp_debug(
        "ironrdp.slow_path_unhandled_update",
        &json!({
            "kind": kind,
            "dataLen": data_len,
        }),
    );
}

impl RdpClientSessionManager {
    pub fn new() -> Self {
        ironrdp::session::set_slow_path_bitmap_diagnostic_hook(log_slow_path_bitmap_tile);
        ironrdp::session::set_slow_path_unhandled_update_diagnostic_hook(log_slow_path_unhandled_update);
        Self {
            runtime: Runtime::new().expect("RDP client runtime initializes"),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn start_session(
        &self,
        app: AppHandle,
        request: StartRdpClientSessionRequest,
    ) -> Result<RdpClientSessionStarted, String> {
        let session_id = required_id(request.session_id.clone())?;
        let host = {
            let h = request.host.trim().to_string();
            if h.is_empty() {
                return Err("RDP host is required".to_string());
            }
            h
        };
        let port = request.port.unwrap_or(DEFAULT_RDP_PORT);
        if port == 0 {
            return Err("RDP port must be between 1 and 65535".to_string());
        }

        {
            let sessions = self.lock_sessions()?;
            if sessions.contains_key(&session_id) {
                return Err(format!("RDP session '{session_id}' is already running"));
            }
        }

        let width = request.desktop_width();
        let height = request.desktop_height();
        let username = request.username.clone();
        let password = request.password.clone().unwrap_or_default();
        let domain = request.domain.clone();
        let ignore_tls_errors = request.ignore_tls_errors;

        rdp_debug(
            "ironrdp.start.request",
            &rdp_client_start_debug_payload(
                &session_id,
                &host,
                port,
                &username,
                domain.as_deref(),
                width,
                height,
            ),
        );

        let (connection_result, framed) = match self.runtime.block_on(rdp_connect(
            app.clone(),
            session_id.clone(),
            host.clone(),
            port,
            username,
            password,
            domain,
            width,
            height,
            ignore_tls_errors,
        )) {
            Ok(result) => result,
            Err(error) => {
                rdp_debug(
                    "ironrdp.start.error",
                    &json!({
                        "sessionId": session_id,
                        "host": host,
                        "port": port,
                        "error": error,
                    }),
                );
                return Err(format!("RDP connect failed: {error}"));
            }
        };

        rdp_debug(
            "ironrdp.start.ok",
            &json!({
                "sessionId": session_id,
                "host": host,
                "port": port,
                "desktopWidth": connection_result.desktop_size.width,
                "desktopHeight": connection_result.desktop_size.height,
            }),
        );

        let (stop_tx, stop_rx) = oneshot::channel();
        let (input_tx, input_rx) = mpsc::unbounded_channel();

        spawn_rdp_event_loop(
            &self.runtime,
            app,
            session_id.clone(),
            connection_result,
            framed,
            input_rx,
            stop_rx,
        );

        let mut sessions = self.lock_sessions()?;
        sessions.insert(
            session_id.clone(),
            RdpClientSession {
                input: input_tx,
                stop: Some(stop_tx),
                connected: true,
            },
        );

        Ok(RdpClientSessionStarted {
            session_id,
            host,
            port,
        })
    }

    pub fn pointer_event(&self, request: RdpClientPointerEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            RdpInput::Pointer {
                x: request.x,
                y: request.y,
                button_mask: request.button_mask,
            },
        )
    }

    pub fn key_event(&self, request: RdpClientKeyEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            RdpInput::Key {
                scancode: request.scancode,
                down: request.down,
            },
        )
    }

    pub fn text_input(&self, request: RdpClientTextRequest) -> Result<(), String> {
        self.queue_input(&request.session_id, RdpInput::Text(request.text))
    }

    pub fn clipboard_text(&self, request: RdpClientTextRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            RdpInput::LocalClipboardText(request.text),
        )
    }

    pub fn send_ctrl_alt_delete(&self, request: RdpClientSimpleRequest) -> Result<(), String> {
        self.queue_input(&request.session_id, RdpInput::CtrlAltDelete)
    }

    pub fn close_session(&self, request: RdpClientSimpleRequest) -> Result<(), String> {
        let removed = {
            let mut sessions = self.lock_sessions()?;
            sessions.remove(&request.session_id)
        };
        if let Some(mut session) = removed {
            if let Some(stop) = session.stop.take() {
                let _ = stop.send(());
            }
        }
        Ok(())
    }

    pub fn session_status(
        &self,
        request: RdpClientSimpleRequest,
    ) -> Result<RdpClientSessionStatus, String> {
        let sessions = self.lock_sessions()?;
        let connected = sessions
            .get(&request.session_id)
            .map(|s| s.connected)
            .unwrap_or(false);
        Ok(RdpClientSessionStatus {
            session_id: request.session_id,
            connected,
        })
    }

    fn queue_input(&self, session_id: &str, input: RdpInput) -> Result<(), String> {
        let sessions = self.lock_sessions()?;
        let tx = sessions
            .get(session_id)
            .map(|s| s.input.clone())
            .ok_or_else(|| format!("RDP session '{session_id}' was not found"))?;
        tx.send(input)
            .map_err(|_| format!("RDP session '{session_id}' input channel is closed"))
    }

    fn lock_sessions(&self) -> Result<MutexGuard<'_, HashMap<String, RdpClientSession>>, String> {
        self.sessions
            .lock()
            .map_err(|_| "RDP session lock is poisoned".to_string())
    }
}

fn rdp_client_start_debug_payload(
    session_id: &str,
    host: &str,
    port: u16,
    username: &str,
    domain: Option<&str>,
    desktop_width: u16,
    desktop_height: u16,
) -> Value {
    json!({
        "sessionId": session_id,
        "host": host,
        "port": port,
        "username": username,
        "domain": domain,
        "desktopWidth": desktop_width,
        "desktopHeight": desktop_height,
        "security": {
            "enableCredSsp": true,
            "enableTls": false,
            "requestedProtocols": ["HYBRID", "HYBRID_EX"],
            "legacyTlsFallbackAllowed": true,
        },
    })
}

// ── No-op NetworkClient (safe for NTLM; Kerberos KDC round-trips never happen) ──

struct NoopNetworkClient;

impl ironrdp_tokio::NetworkClient for NoopNetworkClient {
    async fn send(
        &mut self,
        _request: &ironrdp::connector::sspi::generator::NetworkRequest,
    ) -> ironrdp::connector::ConnectorResult<Vec<u8>> {
        Err(ironrdp::connector::general_err!(
            "no KDC network client; use NTLM credentials not Kerberos"
        ))
    }
}

// ── TLS: OpenSSL upgrade (legacy Windows RDP cipher-suite compatibility) ──

async fn tls_upgrade(
    stream: TcpStream,
    session_id: &str,
    host: &str,
    port: u16,
    server_name: &str,
    ignore_tls_errors: bool,
) -> Result<tokio_openssl::SslStream<TcpStream>, String> {
    use openssl::ssl::{SslConnector, SslMethod, SslOptions, SslVerifyMode, SslVersion};
    use std::pin::Pin;

    rdp_debug(
        "ironrdp.tls.start",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
            "serverName": server_name,
            "backend": "openssl",
            "ignoreTlsErrors": ignore_tls_errors,
            "certificateVerification": "credssp_public_key_binding",
        }),
    );

    // Use OpenSSL for the RDP TLS wrapper. RDP authenticates the server by binding
    // its TLS public key into the CredSSP exchange (see extract_server_public_key),
    // NOT by validating the TLS certificate chain — so verification is disabled and
    // that is safe here. Crucially, Windows RDP servers frequently offer only legacy
    // cipher suites (e.g. RSA key-exchange / CBC-SHA) that modern stacks like rustls
    // and macOS Secure Transport refuse, producing "Cipher Suite negotiation
    // failure". OpenSSL at security level 0 with a broad cipher list negotiates them,
    // matching what the official Microsoft RDP client can do. SNI is left unset to
    // match Windows RDP server expectations.
    let _ = ignore_tls_errors;
    let mut builder = SslConnector::builder(SslMethod::tls_client())
        .map_err(|e| format!("TLS setup failed: {e}"))?;
    builder.set_verify(SslVerifyMode::NONE);
    builder.set_security_level(0);
    builder
        .set_cipher_list("ALL:@SECLEVEL=0")
        .map_err(|e| format!("TLS cipher configuration failed: {e}"))?;
    // Allow TLS 1.0: legacy Windows RDP listeners often ONLY offer TLS 1.0, so
    // requiring a higher version fails with "unsupported protocol". The real cause
    // of the earlier CredSSP "tlsv1 alert internal error" (alert 80) was OpenSSL's
    // TLS 1.0 CBC "empty fragment" (BEAST mitigation) records, which Windows
    // Schannel rejects mid-CredSSP. DONT_INSERT_EMPTY_FRAGMENTS stops those, making
    // our TLS 1.0 records look like the ones Schannel (and the official client)
    // expect. SECLEVEL 0 keeps the server's legacy ciphers available.
    let _ = builder.set_min_proto_version(Some(SslVersion::TLS1));
    builder.set_options(SslOptions::DONT_INSERT_EMPTY_FRAGMENTS);
    let connector = builder.build();

    let mut config = connector
        .configure()
        .map_err(|e| format!("TLS configuration failed: {e}"))?;
    config.set_use_server_name_indication(false);
    config.set_verify_hostname(false);
    let ssl = config
        .into_ssl(server_name)
        .map_err(|e| format!("TLS session init failed: {e}"))?;

    let mut tls_stream = tokio_openssl::SslStream::new(ssl, stream)
        .map_err(|e| format!("TLS stream init failed: {e}"))?;

    match Pin::new(&mut tls_stream).connect().await {
        Ok(()) => {
            rdp_debug(
                "ironrdp.tls.ok",
                &json!({
                    "sessionId": session_id,
                    "host": host,
                    "port": port,
                    "cipher": tls_stream.ssl().current_cipher().map(|c| c.name().to_string()),
                    "protocolVersion": tls_stream.ssl().version_str(),
                }),
            );
            Ok(tls_stream)
        }
        Err(error) => {
            rdp_debug(
                "ironrdp.tls.error",
                &json!({
                    "sessionId": session_id,
                    "host": host,
                    "port": port,
                    "error": error.to_string(),
                }),
            );
            Err(format!("TLS handshake failed: {error}"))
        }
    }
}

/// Server certificate data needed for CredSSP: the SubjectPublicKeyInfo bytes
/// (bound into CredSSP's own pubKeyAuth anti-MITM step) and the RFC 5929
/// `tls-server-end-point` channel binding token (bound into the inner NTLM
/// AUTHENTICATE message so servers enforcing Extended Protection for
/// Authentication accept the logon).
struct ServerCertificateData {
    subject_public_key: Vec<u8>,
    channel_binding_token: Vec<u8>,
}

/// RFC 5929 §4.1: hash the certificate with the hash function used in the
/// certificate's own `signatureAlgorithm`, EXCEPT when that function is MD5 or
/// SHA-1 (or unrecognized), in which case SHA-256 must be used instead. Returns
/// (hash_bytes, algorithm_name_for_logging).
fn tls_server_end_point_hash(cert_der: &[u8], signature_algorithm_oid: &str) -> (Vec<u8>, &'static str) {
    use sha2::{Digest, Sha256, Sha384, Sha512};

    // RSA and ECDSA signature OIDs that use SHA-384/SHA-512, per RFC 3279/4055/5758.
    const SHA384_OIDS: &[&str] = &[
        "1.2.840.113549.1.1.12", // sha384WithRSAEncryption
        "1.2.840.10045.4.3.3",   // ecdsa-with-SHA384
    ];
    const SHA512_OIDS: &[&str] = &[
        "1.2.840.113549.1.1.13", // sha512WithRSAEncryption
        "1.2.840.10045.4.3.4",   // ecdsa-with-SHA512
    ];

    if SHA384_OIDS.contains(&signature_algorithm_oid) {
        (Sha384::digest(cert_der).to_vec(), "SHA-384")
    } else if SHA512_OIDS.contains(&signature_algorithm_oid) {
        (Sha512::digest(cert_der).to_vec(), "SHA-512")
    } else {
        // Covers sha256WithRSAEncryption / ecdsa-with-SHA256 (the common case) as well
        // as the RFC 5929 fallback for MD5/SHA-1/unrecognized algorithms.
        (Sha256::digest(cert_der).to_vec(), "SHA-256")
    }
}

fn extract_server_public_key(
    session_id: &str,
    tls_stream: &tokio_openssl::SslStream<TcpStream>,
) -> Result<ServerCertificateData, String> {
    use x509_cert::der::Decode as _;

    let cert_der = tls_stream
        .ssl()
        .peer_certificate()
        .ok_or_else(|| "RDP server sent no TLS certificate".to_string())?
        .to_der()
        .map_err(|e| format!("failed to encode server certificate as DER: {e}"))?;

    let cert = x509_cert::Certificate::from_der(&cert_der)
        .map_err(|e| format!("failed to parse server certificate: {e}"))?;

    let spki_bytes = cert
        .tbs_certificate
        .subject_public_key_info
        .subject_public_key
        .as_bytes()
        .ok_or_else(|| "server certificate subject public key is not a bitstring".to_string())?
        .to_vec();

    let signature_algorithm_oid = cert.signature_algorithm.oid.to_string();
    let (cert_hash, hash_algorithm) = tls_server_end_point_hash(&cert_der, &signature_algorithm_oid);
    let mut channel_binding_token = b"tls-server-end-point:".to_vec();
    channel_binding_token.extend_from_slice(&cert_hash);

    rdp_debug(
        "ironrdp.certificate.ok",
        &json!({
            "sessionId": session_id,
            "subjectPublicKeyBytes": spki_bytes.len(),
            "signatureAlgorithmOid": signature_algorithm_oid,
            "channelBindingHashAlgorithm": hash_algorithm,
        }),
    );

    Ok(ServerCertificateData {
        subject_public_key: spki_bytes,
        channel_binding_token,
    })
}

// ── Connect helper ────────────────────────────────────────────────────────────

type UpgradedFramed = ironrdp_tokio::TokioFramed<tokio_openssl::SslStream<TcpStream>>;

/// Flatten an error and its `source()` chain into one message, so a generic
/// top-level label (e.g. "CredSSP") surfaces the underlying reason
/// (e.g. an NTLM logon failure) instead of being swallowed.
fn error_chain(error: &dyn std::error::Error) -> String {
    let mut message = error.to_string();
    let mut source = error.source();
    while let Some(inner) = source {
        let inner_text = inner.to_string();
        if !message.ends_with(&inner_text) {
            message.push_str(": ");
            message.push_str(&inner_text);
        }
        source = inner.source();
    }
    message
}

fn tls_error_kind(error: &std::io::Error) -> String {
    format!("{:?}", error.kind())
}

async fn rdp_connect(
    app: AppHandle,
    session_id: String,
    host: String,
    port: u16,
    username: String,
    password: String,
    domain: Option<String>,
    width: u16,
    height: u16,
    ignore_tls_errors: bool,
) -> Result<(ironrdp::connector::ConnectionResult, UpgradedFramed), String> {
    use ironrdp::connector::{
        ClientConnector, Config, Credentials, DesktopSize, ServerName, credssp::KerberosConfig,
    };
    use ironrdp::pdu::gcc::KeyboardType;
    use ironrdp::pdu::rdp::capability_sets::MajorPlatformType;
    use ironrdp_tokio::{TokioFramed, connect_begin, mark_as_upgraded};

    // CredSSP/NTLM needs the domain separated from the username. Split a
    // `DOMAIN\user` login into (domain, user); otherwise keep the requested
    // domain and the username as-is (UPN `user@domain` is left intact).
    let (username, domain) = match username.split_once('\\') {
        Some((d, u)) if !d.trim().is_empty() && !u.trim().is_empty() => {
            (u.trim().to_string(), Some(d.trim().to_string()))
        }
        _ => (username, domain),
    };

    // Step 1: TCP connect + create framed
    rdp_debug(
        "ironrdp.tcp.start",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
        }),
    );
    let stream = match TcpStream::connect((host.as_str(), port)).await {
        Ok(stream) => stream,
        Err(error) => {
            rdp_debug(
                "ironrdp.tcp.error",
                &json!({
                    "sessionId": session_id,
                    "host": host,
                    "port": port,
                    "error": error.to_string(),
                    "errorKind": format!("{:?}", error.kind()),
                }),
            );
            return Err(format!("TCP connect to {host}:{port} failed: {error}"));
        }
    };
    let client_addr = stream.local_addr().map_err(|e| e.to_string())?;
    let peer_addr = stream.peer_addr().ok();
    rdp_debug(
        "ironrdp.tcp.ok",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
            "clientAddr": client_addr.to_string(),
            "peerAddr": peer_addr.map(|addr| addr.to_string()),
        }),
    );
    let mut framed: TokioFramed<TcpStream> = TokioFramed::new(stream);

    // Step 2: Build connector config
    let config = Config {
        credentials: Credentials::UsernamePassword { username, password },
        domain,
        enable_tls: false,
        enable_credssp: true,
        desktop_size: DesktopSize { width, height },
        desktop_scale_factor: 0,
        keyboard_type: KeyboardType::IbmEnhanced,
        keyboard_subtype: 0,
        keyboard_functional_keys_count: 12,
        keyboard_layout: 0x0409, // en-US
        ime_file_name: String::new(),
        enable_server_pointer: true,
        pointer_software_rendering: false,
        client_build: 0,
        client_name: "KKTerm".to_string(),
        client_dir: String::new(),
        platform: MajorPlatformType::UNIX,
        hardware_id: None,
        // Reverted: requesting 16bpp made rendering strictly worse against the
        // legacy test host (solid black instead of the previous partially-visible,
        // sheared content at 32bpp), so it was not the fix. Back to the default.
        bitmap: None,
        compression_type: None,
        performance_flags: ironrdp::pdu::rdp::client_info::PerformanceFlags::default(),
        autologon: false,
        enable_audio_playback: false,
        timezone_info: ironrdp::pdu::rdp::client_info::TimezoneInfo::default(),
        license_cache: None,
        multitransport_flags: None,
        alternate_shell: String::new(),
        work_dir: String::new(),
        dig_product_id: String::new(),
        request_data: None,
    };

    // Step 3: Create connector + begin
    rdp_debug(
        "ironrdp.connect_begin.start",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
            "clientAddr": client_addr.to_string(),
            "username": match &config.credentials {
                Credentials::UsernamePassword { username, .. } => username.as_str(),
                Credentials::SmartCard { .. } => "smart_card",
            },
            "domain": config.domain.as_deref(),
            "desktopWidth": width,
            "desktopHeight": height,
            "security": {
                "enableCredSsp": config.enable_credssp,
                "enableTls": config.enable_tls,
                "requestedProtocols": ["HYBRID", "HYBRID_EX"],
                "legacyTlsFallbackAllowed": config.enable_tls,
            },
        }),
    );
    let mut connector = ClientConnector::new(config, client_addr);
    connector.attach_static_channel(CliprdrClient::new(Box::new(CanvasCliprdrBackend::new(
        app.clone(),
        session_id.to_string(),
    ))));
    let should_upgrade = match connect_begin(&mut framed, &mut connector).await {
        Ok(should_upgrade) => should_upgrade,
        Err(error) => {
            let error = error_chain(&error);
            rdp_debug(
                "ironrdp.connect_begin.error",
                &json!({
                    "sessionId": session_id,
                    "host": host,
                    "port": port,
                    "error": error,
                }),
            );
            return Err(format!("RDP connect_begin failed: {error}"));
        }
    };
    rdp_debug(
        "ironrdp.connect_begin.ok",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
        }),
    );

    // Step 4: Extract inner stream
    let (tcp_stream, leftover) = framed.into_inner();
    rdp_debug(
        "ironrdp.security_upgrade.ready",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
            "leftoverBytes": leftover.len(),
        }),
    );

    // Step 5: TLS upgrade
    let tls_stream = tls_upgrade(tcp_stream, &session_id, &host, port, &host, ignore_tls_errors).await?;

    // Step 6: Extract server public key
    let server_cert_data = extract_server_public_key(&session_id, &tls_stream)?;

    // Step 7: Mark as upgraded
    let upgraded = mark_as_upgraded(should_upgrade, &mut connector);

    // Step 8: Create upgraded framed over the concrete TLS stream
    let mut upgraded_framed: UpgradedFramed = TokioFramed::new_with_leftover(tls_stream, leftover);

    // Step 9: Finalize
    rdp_debug(
        "ironrdp.connect_finalize.start",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
        }),
    );
    let connection_result = match ironrdp_tokio::connect_finalize_with_channel_bindings::<_, NoopNetworkClient>(
        upgraded,
        connector,
        &mut upgraded_framed,
        &mut NoopNetworkClient,
        ServerName::new(host.clone()),
        server_cert_data.subject_public_key,
        None::<KerberosConfig>,
        Some(server_cert_data.channel_binding_token),
    )
    .await
    {
        Ok(connection_result) => connection_result,
        Err(error) => {
            let error = error_chain(&error);
            rdp_debug(
                "ironrdp.connect_finalize.error",
                &json!({
                    "sessionId": session_id,
                    "host": host,
                    "port": port,
                    "error": error,
                }),
            );
            return Err(format!("RDP connect_finalize failed: {error}"));
        }
    };
    rdp_debug(
        "ironrdp.connect_finalize.ok",
        &json!({
            "sessionId": session_id,
            "host": host,
            "port": port,
            "desktopWidth": connection_result.desktop_size.width,
            "desktopHeight": connection_result.desktop_size.height,
        }),
    );

    Ok((connection_result, upgraded_framed))
}

// ── Event loop ────────────────────────────────────────────────────────────────

#[derive(Debug)]
struct CanvasClipboardProxy;

impl ClipboardMessageProxy for CanvasClipboardProxy {
    fn send_clipboard_message(&self, message: ClipboardMessage) {
        if let ClipboardMessage::Error(error) = message {
            eprintln!("[rdp clipboard] {error}");
        }
    }
}

#[derive(Debug)]
struct CanvasCliprdrBackend {
    app: AppHandle,
    session_id: String,
    remote_formats: Vec<ClipboardFormat>,
    local_text: Option<String>,
    pending_remote_text_request: bool,
}

impl CanvasCliprdrBackend {
    fn new(app: AppHandle, session_id: String) -> Self {
        Self {
            app,
            session_id,
            remote_formats: Vec::new(),
            local_text: None,
            pending_remote_text_request: false,
        }
    }
}

impl AsAny for CanvasCliprdrBackend {
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

impl CliprdrBackend for CanvasCliprdrBackend {
    fn temporary_directory(&self) -> &str {
        ""
    }

    fn client_capabilities(&self) -> ClipboardGeneralCapabilityFlags {
        ClipboardGeneralCapabilityFlags::empty()
    }

    fn on_ready(&mut self) {}

    fn on_request_format_list(&mut self) {}

    fn on_process_negotiated_capabilities(
        &mut self,
        _capabilities: ClipboardGeneralCapabilityFlags,
    ) {
    }

    fn on_remote_copy(&mut self, available_formats: &[ClipboardFormat]) {
        self.remote_formats = available_formats.to_vec();
        if self
            .remote_formats
            .iter()
            .any(|format| format.id == ClipboardFormatId::CF_UNICODETEXT)
        {
            self.pending_remote_text_request = true;
        }
    }

    fn on_format_data_request(&mut self, request: FormatDataRequest) {
        if request.format == ClipboardFormatId::CF_UNICODETEXT {
            CanvasClipboardProxy.send_clipboard_message(ClipboardMessage::SendFormatData(
                utf16_clipboard_response(self.local_text.as_deref().unwrap_or("")),
            ));
        }
    }

    fn on_format_data_response(&mut self, response: FormatDataResponse<'_>) {
        if response.is_error() {
            return;
        }
        if let Some(text) = decode_utf16_clipboard_text(response.data()) {
            emit_rdp_event(
                &self.app,
                RdpCanvasEvent::ClipboardText {
                    session_id: self.session_id.clone(),
                    text,
                },
            );
        }
    }

    fn on_file_contents_request(&mut self, _request: FileContentsRequest) {}
    fn on_file_contents_response(&mut self, _response: FileContentsResponse<'_>) {}
    fn on_lock(&mut self, _data_id: LockDataId) {}
    fn on_unlock(&mut self, _data_id: LockDataId) {}
}

fn utf16_clipboard_response(text: &str) -> OwnedFormatDataResponse {
    let mut data = Vec::with_capacity((text.len() + 1) * 2);
    for code_unit in text.encode_utf16() {
        data.extend_from_slice(&code_unit.to_le_bytes());
    }
    data.extend_from_slice(&0u16.to_le_bytes());
    FormatDataResponse::new_data(data).into_owned()
}

fn decode_utf16_clipboard_text(data: &[u8]) -> Option<String> {
    let mut units = Vec::with_capacity(data.len() / 2);
    for chunk in data.chunks_exact(2) {
        let unit = u16::from_le_bytes([chunk[0], chunk[1]]);
        if unit == 0 {
            break;
        }
        units.push(unit);
    }
    String::from_utf16(&units).ok()
}

fn spawn_rdp_event_loop(
    runtime: &Runtime,
    app: AppHandle,
    session_id: String,
    connection_result: ironrdp::connector::ConnectionResult,
    mut framed: UpgradedFramed,
    mut input_rx: mpsc::UnboundedReceiver<RdpInput>,
    mut stop: oneshot::Receiver<()>,
) {
    runtime.spawn(async move {
        // Brings the Framed::write_all trait method into scope for the
        // Refresh Rect PDU sent from the Deactivation-Reactivation handler.
        use ironrdp_tokio::FramedWrite as _;
        eprintln!("[rdp {session_id}] event loop starting");
        rdp_debug(
            "ironrdp.event_loop.start",
            &json!({
                "sessionId": session_id,
            }),
        );

        let mut width = connection_result.desktop_size.width;
        let mut height = connection_result.desktop_size.height;

        emit_rdp_event(
            &app,
            RdpCanvasEvent::Connected {
                session_id: session_id.clone(),
                name: "RDP".to_string(),
            },
        );
        emit_rdp_event(
            &app,
            RdpCanvasEvent::Resolution { session_id: session_id.clone(), width, height },
        );

        let mut image = ironrdp::session::image::DecodedImage::new(
            ironrdp::graphics::image_processing::PixelFormat::RgbA32,
            width,
            height,
        );
        let mut active_stage = ironrdp::session::ActiveStage::new(connection_result);
        let mut input_db = ironrdp::input::Database::new();
        let mut last_button_mask: u8 = 0;
        // Bounded diagnostic: log the first few GraphicsUpdate rectangles so a
        // rendering-artifact report can be cross-checked against exactly what
        // regions/sizes the server painted, without flooding the log for the
        // rest of a long session.
        let mut graphics_updates_logged: u32 = 0;
        const MAX_GRAPHICS_UPDATE_LOGS: u32 = 24;

        loop {
            tokio::select! {
                _ = &mut stop => {
                    eprintln!("[rdp {session_id}] stop signal received");
                    break;
                }
                input = input_rx.recv() => {
                    match input {
                        Some(rdp_input) => {
                            if let Err(e) = send_rdp_input(
                                &mut framed,
                                &mut active_stage,
                                &mut input_db,
                                &mut last_button_mask,
                                rdp_input,
                            ).await {
                                eprintln!("[rdp {session_id}] send_rdp_input error: {e}");
                                rdp_debug(
                                    "ironrdp.input.error",
                                    &json!({
                                        "sessionId": session_id,
                                        "error": e,
                                    }),
                                );
                                emit_rdp_event(&app, RdpCanvasEvent::Error {
                                    session_id: session_id.clone(),
                                    message: e,
                                });
                                break;
                            }
                        }
                        None => break,
                    }
                }
                pdu = framed.read_pdu() => {
                    match pdu {
                        Ok((action, payload)) => {
                            let outputs = match active_stage.process(&mut image, action, &payload) {
                                Ok(outputs) => outputs,
                                Err(e) => {
                                    // Flatten the source chain: SessionErrorKind::Custom hides the
                                    // real cause (codec/PDU/decode error) in e.source().
                                    let detail = error_chain(&e);
                                    // Dump the raw PDU bytes so the exact server PDU can be decoded
                                    // by hand (TPKT/X224/MCS/ShareControlHeader) to see what it is.
                                    let payload_hex: String = payload
                                        .iter()
                                        .take(80)
                                        .map(|b| format!("{b:02x}"))
                                        .collect();
                                    eprintln!("[rdp {session_id}] active_stage.process error: {detail}");
                                    rdp_debug(
                                        "ironrdp.active_stage.error",
                                        &json!({
                                            "sessionId": session_id,
                                            "error": detail,
                                            "action": format!("{action:?}"),
                                            "payloadLen": payload.len(),
                                            "payloadHex": payload_hex,
                                        }),
                                    );
                                    emit_rdp_event(&app, RdpCanvasEvent::Error {
                                        session_id: session_id.clone(),
                                        message: detail,
                                    });
                                    break;
                                }
                            };

                            let mut should_break = false;
                            for output in outputs {
                                use ironrdp::session::ActiveStageOutput;
                                match output {
                                    ActiveStageOutput::ResponseFrame(frame) => {
                                        if let Err(e) = write_rdp_frame(&mut framed, &frame).await {
                                            eprintln!("[rdp {session_id}] write_all error: {e}");
                                            rdp_debug(
                                                "ironrdp.write.error",
                                                &json!({
                                                    "sessionId": session_id,
                                                    "error": e.to_string(),
                                                }),
                                            );
                                            emit_rdp_event(&app, RdpCanvasEvent::Error {
                                                session_id: session_id.clone(),
                                                message: e.to_string(),
                                            });
                                            should_break = true;
                                            break;
                                        }
                                    }
                                    ActiveStageOutput::GraphicsUpdate(region) => {
                                        let rx = u16::try_from(region.left).unwrap_or(0);
                                        let ry = u16::try_from(region.top).unwrap_or(0);
                                        let rw = u16::try_from(
                                            region.right.saturating_sub(region.left).saturating_add(1)
                                        ).unwrap_or(0);
                                        let rh = u16::try_from(
                                            region.bottom.saturating_sub(region.top).saturating_add(1)
                                        ).unwrap_or(0);
                                        let image_data = image.data();
                                        if graphics_updates_logged < MAX_GRAPHICS_UPDATE_LOGS {
                                            graphics_updates_logged += 1;
                                            // Sample a few pixels (corners + center) of the decoded
                                            // buffer for this rectangle so a "black screen" report can
                                            // be root-caused precisely: genuinely-decoded black pixels
                                            // (e.g. an empty 8bpp palette) vs. correctly-decoded color
                                            // data that never makes it to the display.
                                            let sample_at = |sx: u16, sy: u16| -> Option<[u8; 4]> {
                                                let stride = usize::from(width) * 4;
                                                let idx = usize::from(sy) * stride + usize::from(sx) * 4;
                                                image_data.get(idx..idx + 4).map(|s| [s[0], s[1], s[2], s[3]])
                                            };
                                            let mid_x = rx.saturating_add(rw / 2);
                                            let mid_y = ry.saturating_add(rh / 2);
                                            rdp_debug(
                                                "ironrdp.graphics_update",
                                                &json!({
                                                    "sessionId": session_id,
                                                    "x": rx,
                                                    "y": ry,
                                                    "width": rw,
                                                    "height": rh,
                                                    "imageWidth": width,
                                                    "imageHeight": height,
                                                    "samplePixelTopLeftRgba": sample_at(rx, ry),
                                                    "samplePixelCenterRgba": sample_at(mid_x, mid_y),
                                                }),
                                            );
                                        }
                                        let rect_rgba = extract_rgba_rect(image_data, width, rx, ry, rw, rh);
                                        emit_rdp_event(&app, RdpCanvasEvent::RawImage {
                                            session_id: session_id.clone(),
                                            x: rx,
                                            y: ry,
                                            width: rw,
                                            height: rh,
                                            rgba: BASE64.encode(rect_rgba),
                                        });
                                    }
                                    ActiveStageOutput::PointerBitmap(pointer) => {
                                        let event = cursor_event(&session_id, &pointer);
                                        emit_rdp_event(&app, event);
                                    }
                                    ActiveStageOutput::Terminate(_reason) => {
                                        eprintln!("[rdp {session_id}] server initiated disconnect");
                                        rdp_debug(
                                            "ironrdp.server_disconnect",
                                            &json!({
                                                "sessionId": session_id,
                                            }),
                                        );
                                        should_break = true;
                                        break;
                                    }
                                    ActiveStageOutput::DeactivateAll(mut connection_activation) => {
                                        // Deactivation-Reactivation Sequence. Legacy Windows RDP
                                        // hosts send a Server Deactivate All right after the initial
                                        // capability exchange and then re-run the Demand/Confirm
                                        // Active handshake. Drive that sub-sequence to completion here
                                        // (mirrors the official ironrdp-client); without it the next
                                        // PDU is decoded against stale share state and fails with
                                        // "ShareControlHeader: not enough bytes".
                                        rdp_debug(
                                            "ironrdp.reactivation.start",
                                            &json!({ "sessionId": session_id }),
                                        );
                                        let mut buf = ironrdp::core::WriteBuf::new();
                                        let reactivated = loop {
                                            if let Err(e) = ironrdp_tokio::single_sequence_step(
                                                &mut framed,
                                                &mut *connection_activation,
                                                &mut buf,
                                            )
                                            .await
                                            {
                                                let detail = error_chain(&e);
                                                eprintln!("[rdp {session_id}] reactivation error: {detail}");
                                                rdp_debug(
                                                    "ironrdp.reactivation.error",
                                                    &json!({ "sessionId": session_id, "error": detail }),
                                                );
                                                emit_rdp_event(&app, RdpCanvasEvent::Error {
                                                    session_id: session_id.clone(),
                                                    message: detail,
                                                });
                                                break false;
                                            }
                                            if let ironrdp::connector::connection_activation::ConnectionActivationState::Finalized {
                                                io_channel_id,
                                                user_channel_id,
                                                desktop_size,
                                                share_id,
                                                enable_server_pointer,
                                                pointer_software_rendering,
                                            } = connection_activation.connection_activation_state()
                                            {
                                                width = desktop_size.width;
                                                height = desktop_size.height;
                                                image = ironrdp::session::image::DecodedImage::new(
                                                    ironrdp::graphics::image_processing::PixelFormat::RgbA32,
                                                    width,
                                                    height,
                                                );
                                                active_stage.set_fastpath_processor(
                                                    ironrdp::session::fast_path::ProcessorBuilder {
                                                        io_channel_id,
                                                        user_channel_id,
                                                        share_id,
                                                        enable_server_pointer,
                                                        pointer_software_rendering,
                                                        bulk_decompressor: None,
                                                    }
                                                    .build(),
                                                );
                                                active_stage.set_share_id(share_id);
                                                active_stage.set_enable_server_pointer(enable_server_pointer);
                                                rdp_debug(
                                                    "ironrdp.reactivation.ok",
                                                    &json!({
                                                        "sessionId": session_id,
                                                        "width": width,
                                                        "height": height,
                                                    }),
                                                );
                                                emit_rdp_event(&app, RdpCanvasEvent::Resolution {
                                                    session_id: session_id.clone(),
                                                    width,
                                                    height,
                                                });
                                                // Slow-path bitmap update PDUs can bundle several
                                                // scattered tiles; the server only proactively resends
                                                // the tiles it considers dirty, which after this fresh
                                                // (all-zero) framebuffer can leave real screen content
                                                // never repainted. Ask the server to redraw the entire
                                                // desktop now, the same way a real client recovers from
                                                // a resize/reactivation before the user notices gaps.
                                                buf.clear();
                                                let refresh_pdu = ironrdp::pdu::rdp::headers::ShareDataPdu::RefreshRectangle(
                                                    ironrdp::pdu::rdp::refresh_rectangle::RefreshRectanglePdu {
                                                        areas_to_refresh: vec![ironrdp::pdu::geometry::InclusiveRectangle {
                                                            left: 0,
                                                            top: 0,
                                                            right: width.saturating_sub(1),
                                                            bottom: height.saturating_sub(1),
                                                        }],
                                                    },
                                                );
                                                match active_stage.encode_static(&mut buf, refresh_pdu) {
                                                    Ok(_) => {
                                                        if let Err(e) = framed.write_all(buf.filled()).await {
                                                            rdp_debug(
                                                                "ironrdp.refresh_rect.error",
                                                                &json!({ "sessionId": session_id, "error": e.to_string() }),
                                                            );
                                                        }
                                                    }
                                                    Err(e) => {
                                                        rdp_debug(
                                                            "ironrdp.refresh_rect.error",
                                                            &json!({ "sessionId": session_id, "error": e.to_string() }),
                                                        );
                                                    }
                                                }
                                                break true;
                                            }
                                        };
                                        if !reactivated {
                                            should_break = true;
                                            break;
                                        }
                                    }
                                    _ => {}
                                }
                            }
                            if should_break {
                                break;
                            }
                            if let Err(e) = flush_pending_clipboard_request(&mut framed, &mut active_stage).await {
                                eprintln!("[rdp {session_id}] clipboard request error: {e}");
                            }
                        }
                        Err(e) => {
                            eprintln!("[rdp {session_id}] read_pdu error: {e}");
                            rdp_debug(
                                "ironrdp.read.error",
                                &json!({
                                    "sessionId": session_id,
                                    "error": e.to_string(),
                                }),
                            );
                            emit_rdp_event(&app, RdpCanvasEvent::Error {
                                session_id: session_id.clone(),
                                message: e.to_string(),
                            });
                            break;
                        }
                    }
                }
            }
        }

        eprintln!("[rdp {session_id}] event loop exiting");
        rdp_debug(
            "ironrdp.event_loop.exit",
            &json!({
                "sessionId": session_id,
            }),
        );
        emit_rdp_event(&app, RdpCanvasEvent::Disconnected { session_id });
    });
}

// ── Input stub (Task 5 fills in real IronRDP input encoding) ──────────────────

/// Detect press/release transitions for the three primary mouse buttons between
/// a previous and current VNC-style button mask (bit 0 = left, 1 = middle,
/// 2 = right). Returns `(button_bit, pressed)` for each changed button.
fn primary_button_transitions(prev: u8, now: u8) -> Vec<(u8, bool)> {
    let mut out = Vec::new();
    for bit in 0..3u8 {
        let was = prev & (1 << bit) != 0;
        let is = now & (1 << bit) != 0;
        if is != was {
            out.push((bit, is));
        }
    }
    out
}

fn mouse_button_for_bit(bit: u8) -> ironrdp::input::MouseButton {
    use ironrdp::input::MouseButton;
    match bit {
        0 => MouseButton::Left,
        1 => MouseButton::Middle,
        _ => MouseButton::Right,
    }
}

/// Translate a queued `RdpInput` into IronRDP input operations, apply them to the
/// keyboard/mouse state `db`, encode the resulting FastPath events, and write the
/// PDU to the server. `last_button_mask` carries the previous primary-button mask
/// so press/release can be derived from the absolute mask the frontend sends.
async fn send_rdp_input(
    framed: &mut UpgradedFramed,
    active_stage: &mut ironrdp::session::ActiveStage,
    db: &mut ironrdp::input::Database,
    last_button_mask: &mut u8,
    input: RdpInput,
) -> Result<(), String> {
    use ironrdp::input::{MousePosition, Operation, Scancode, WheelRotations};
    let mut ops: Vec<Operation> = Vec::new();
    match input {
        RdpInput::Pointer { x, y, button_mask } => {
            ops.push(Operation::MouseMove(MousePosition { x, y }));
            for (bit, pressed) in primary_button_transitions(*last_button_mask, button_mask) {
                let button = mouse_button_for_bit(bit);
                ops.push(if pressed {
                    Operation::MouseButtonPressed(button)
                } else {
                    Operation::MouseButtonReleased(button)
                });
            }
            // RFB-style wheel bits (3 = up, 4 = down) are momentary notches.
            if button_mask & (1 << 3) != 0 {
                ops.push(Operation::WheelRotations(WheelRotations {
                    is_vertical: true,
                    rotation_units: 120,
                }));
            }
            if button_mask & (1 << 4) != 0 {
                ops.push(Operation::WheelRotations(WheelRotations {
                    is_vertical: true,
                    rotation_units: -120,
                }));
            }
            // Remember only the three primary buttons; wheel bits are momentary.
            *last_button_mask = button_mask & 0b0000_0111;
        }
        RdpInput::Key { scancode, down } => {
            let sc = Scancode::from(scancode);
            ops.push(if down {
                Operation::KeyPressed(sc)
            } else {
                Operation::KeyReleased(sc)
            });
        }
        RdpInput::Text(text) => {
            // Each character is sent as a Unicode keyboard event (press + release),
            // so IME-composed and layout-specific characters reach the server
            // correctly regardless of the remote keyboard layout.
            for character in text.chars() {
                ops.push(Operation::UnicodeKeyPressed(character));
                ops.push(Operation::UnicodeKeyReleased(character));
            }
        }
        RdpInput::LocalClipboardText(text) => {
            let cliprdr = active_stage
                .get_svc_processor_mut::<CliprdrClient>()
                .ok_or_else(|| "RDP clipboard channel is not available".to_string())?;
            if let Some(backend) = cliprdr.downcast_backend_mut::<CanvasCliprdrBackend>() {
                backend.local_text = Some(text);
            }
            let messages = cliprdr
                .initiate_copy(&[ClipboardFormat::new(ClipboardFormatId::CF_UNICODETEXT)])
                .map_err(|e| format!("failed to advertise local clipboard to RDP: {e}"))?;
            let bytes = active_stage
                .process_svc_processor_messages::<CliprdrClient>(messages)
                .map_err(|e| format!("failed to encode RDP clipboard update: {e}"))?;
            write_rdp_frame(framed, &bytes).await?;
            return Ok(());
        }
        RdpInput::CtrlAltDelete => {
            let ctrl = Scancode::from_u16(0x001D);
            let alt = Scancode::from_u16(0x0038);
            let delete = Scancode::from_u16(0xE053);
            ops.extend([
                Operation::KeyPressed(ctrl),
                Operation::KeyPressed(alt),
                Operation::KeyPressed(delete),
                Operation::KeyReleased(delete),
                Operation::KeyReleased(alt),
                Operation::KeyReleased(ctrl),
            ]);
        }
    }

    let events = db.apply(ops);
    if events.is_empty() {
        return Ok(());
    }

    let pdu = ironrdp::pdu::input::fast_path::FastPathInput::new(events.to_vec())
        .map_err(|e| format!("failed to build RDP input PDU: {e}"))?;
    let bytes =
        ironrdp::core::encode_vec(&pdu).map_err(|e| format!("failed to encode RDP input: {e}"))?;
    write_rdp_frame(framed, &bytes).await?;
    Ok(())
}

async fn write_rdp_frame(framed: &mut UpgradedFramed, bytes: &[u8]) -> Result<(), String> {
    use ironrdp_tokio::FramedWrite as _;

    framed
        .write_all(bytes)
        .await
        .map_err(|e| format!("failed to send RDP frame: {e}"))
}

async fn flush_pending_clipboard_request(
    framed: &mut UpgradedFramed,
    active_stage: &mut ironrdp::session::ActiveStage,
) -> Result<(), String> {
    let cliprdr = match active_stage.get_svc_processor_mut::<CliprdrClient>() {
        Some(cliprdr) => cliprdr,
        None => return Ok(()),
    };
    let should_request = cliprdr
        .downcast_backend_mut::<CanvasCliprdrBackend>()
        .map(|backend| {
            let pending = backend.pending_remote_text_request;
            backend.pending_remote_text_request = false;
            pending
        })
        .unwrap_or(false);
    if !should_request {
        return Ok(());
    }
    let messages = cliprdr
        .initiate_paste(ClipboardFormatId::CF_UNICODETEXT)
        .map_err(|e| format!("failed to request remote clipboard text: {e}"))?;
    let bytes = active_stage
        .process_svc_processor_messages::<CliprdrClient>(messages)
        .map_err(|e| format!("failed to encode RDP clipboard request: {e}"))?;
    write_rdp_frame(framed, &bytes).await
}

// ── Cursor stub (Task 5 fills in real pointer decoding) ───────────────────────

fn cursor_event(
    session_id: &str,
    pointer: &ironrdp::graphics::pointer::DecodedPointer,
) -> RdpCanvasEvent {
    // Task 5 may refine the pixel format; `bitmap_data` is the decoded pointer
    // bitmap and `hotspot_x/y` the click hotspot.
    RdpCanvasEvent::SetCursor {
        session_id: session_id.to_string(),
        width: pointer.width,
        height: pointer.height,
        hot_x: pointer.hotspot_x,
        hot_y: pointer.hotspot_y,
        rgba: BASE64.encode(&pointer.bitmap_data),
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
    {
        return Err("RDP session id may only contain letters, digits, '-' or '_'".to_string());
    }
    Ok(trimmed.to_string())
}

/// Copy the `(x, y, w, h)` sub-rectangle out of a full-frame RGBA buffer
/// (`stride = full_width * 4`) into a tightly packed RGBA buffer.
fn extract_rgba_rect(full_rgba: &[u8], full_width: u16, x: u16, y: u16, w: u16, h: u16) -> Vec<u8> {
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
    // A slow-path bitmap update PDU can bundle several scattered tile
    // rectangles; ironrdp-session reports the union of their bounds as one
    // "changed" rectangle without filling the gaps between tiles. Right after a
    // Deactivation-Reactivation Sequence recreates the framebuffer (all zero
    // bytes), those gaps carry alpha=0 straight through, and since the canvas
    // is painted with putImageData (a direct pixel replacement, not a blend),
    // those transparent pixels punch see-through holes over whatever was drawn
    // before, appearing as scribble-like corruption. An RDP framebuffer has no
    // legitimate use for translucency, so force every extracted pixel opaque.
    for pixel in out.chunks_exact_mut(4) {
        pixel[3] = 0xff;
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
    fn rdp_client_start_debug_payload_excludes_password() {
        let payload = rdp_client_start_debug_payload(
            "rdp-1",
            "server.example.test",
            3389,
            "admin",
            Some("EXAMPLE"),
            1440,
            900,
        );

        assert_eq!(payload["sessionId"], "rdp-1");
        assert_eq!(payload["host"], "server.example.test");
        assert_eq!(payload["port"], 3389);
        assert_eq!(payload["username"], "admin");
        assert_eq!(payload["domain"], "EXAMPLE");
        assert_eq!(payload["desktopWidth"], 1440);
        assert_eq!(payload["desktopHeight"], 900);
        assert_eq!(payload["security"]["enableCredSsp"], true);
        assert_eq!(payload["security"]["enableTls"], false);
        assert!(payload.get("password").is_none());
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
        let full = vec![0, 0, 0, 255, 1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255];
        let rect = extract_rgba_rect(&full, width, 1, 1, 1, 1);
        assert_eq!(rect, vec![3, 3, 3, 255]);
    }

    #[test]
    fn button_transitions_detect_press_and_release() {
        assert_eq!(primary_button_transitions(0b000, 0b001), vec![(0, true)]); // left down
        assert_eq!(primary_button_transitions(0b001, 0b000), vec![(0, false)]); // left up
        assert_eq!(primary_button_transitions(0b001, 0b001), vec![]); // held, no change
        assert_eq!(primary_button_transitions(0b000, 0b100), vec![(2, true)]); // right down
        assert_eq!(
            primary_button_transitions(0b000, 0b101),
            vec![(0, true), (2, true)] // left + right down
        );
    }
}
