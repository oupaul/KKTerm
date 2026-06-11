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
//! ironrdp_tokio::TokioFramed<tokio::net::TcpStream>                       // pre-TLS
//! ironrdp_tokio::TokioFramed<tokio_rustls::client::TlsStream<TcpStream>>  // post-TLS (concrete; see UpgradedFramed)
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
//! // Step 5: TLS upgrade via tokio-rustls
//! let tls_stream = tls_upgrade(initial_stream, &host).await?;
//!
//! // Step 6: Extract server public key
//! let server_public_key = extract_server_public_key(&tls_stream)?;
//!
//! // Step 7: Mark as upgraded
//! let upgraded = ironrdp_tokio::mark_as_upgraded(should_upgrade, &mut connector);
//!
//! // Step 8: Create upgraded framed over the concrete TLS stream (kept concrete,
//! // not box-erased, so the spawned session future stays `Send`).
//! let mut upgraded_framed = ironrdp_tokio::TokioFramed::new_with_leftover(tls_stream, leftover_bytes);
//!
//! // Step 9: Finalize connection
//! let connection_result = ironrdp_tokio::connect_finalize(
//!     upgraded, connector, &mut upgraded_framed, &mut NoopNetworkClient,
//!     ServerName::new(host), server_public_key, None,
//! ).await?;
//! ```

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex, MutexGuard},
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
    Pointer { x: u16, y: u16, button_mask: u8 },
    Key { scancode: u16, down: bool },
    /// Composed text (IME / printable characters) sent as RDP Unicode keyboard
    /// events — layout- and IME-independent, unlike scancodes.
    Text(String),
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

        let (connection_result, framed) = self
            .runtime
            .block_on(rdp_connect(
                host.clone(),
                port,
                username,
                password,
                domain,
                width,
                height,
            ))
            .map_err(|e| format!("RDP connect failed: {e}"))?;

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

        Ok(RdpClientSessionStarted { session_id, host, port })
    }

    pub fn pointer_event(&self, request: RdpClientPointerEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            RdpInput::Pointer { x: request.x, y: request.y, button_mask: request.button_mask },
        )
    }

    pub fn key_event(&self, request: RdpClientKeyEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            RdpInput::Key { scancode: request.scancode, down: request.down },
        )
    }

    pub fn text_input(&self, request: RdpClientTextRequest) -> Result<(), String> {
        self.queue_input(&request.session_id, RdpInput::Text(request.text))
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

    pub fn session_status(&self, request: RdpClientSimpleRequest) -> Result<RdpClientSessionStatus, String> {
        let sessions = self.lock_sessions()?;
        let connected = sessions
            .get(&request.session_id)
            .map(|s| s.connected)
            .unwrap_or(false);
        Ok(RdpClientSessionStatus { session_id: request.session_id, connected })
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
        self.sessions.lock().map_err(|_| "RDP session lock is poisoned".to_string())
    }
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

// ── TLS: NoCertificateVerification (RDP never verifies the cert chain) ────────

#[derive(Debug)]
struct NoCertificateVerification(Arc<rustls::crypto::CryptoProvider>);

impl rustls::client::danger::ServerCertVerifier for NoCertificateVerification {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::pki_types::CertificateDer<'_>,
        _intermediates: &[rustls::pki_types::CertificateDer<'_>],
        _server_name: &rustls::pki_types::ServerName<'_>,
        _ocsp_response: &[u8],
        _now: rustls::pki_types::UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        cert: &rustls::pki_types::CertificateDer<'_>,
        dsa: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls12_signature(
            message,
            cert,
            dsa,
            &self.0.signature_verification_algorithms,
        )
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        cert: &rustls::pki_types::CertificateDer<'_>,
        dsa: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls13_signature(
            message,
            cert,
            dsa,
            &self.0.signature_verification_algorithms,
        )
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        self.0.signature_verification_algorithms.supported_schemes()
    }
}

async fn tls_upgrade(
    stream: TcpStream,
    server_name: &str,
) -> Result<tokio_rustls::client::TlsStream<TcpStream>, String> {
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let tls_config = rustls::ClientConfig::builder_with_provider(Arc::clone(&provider))
        .with_protocol_versions(&[&rustls::version::TLS12, &rustls::version::TLS13])
        .map_err(|e| format!("TLS config error: {e}"))?
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(NoCertificateVerification(provider)))
        .with_no_client_auth();

    // Disable TLS session resumption — CredSSP/MS-CSSP requires it.
    let mut tls_config = tls_config;
    tls_config.resumption = rustls::client::Resumption::disabled();

    let connector = tokio_rustls::TlsConnector::from(Arc::new(tls_config));
    let dns_name = rustls::pki_types::ServerName::try_from(server_name.to_string())
        .map_err(|e| format!("invalid server name '{server_name}': {e}"))?;
    connector
        .connect(dns_name, stream)
        .await
        .map_err(|e| format!("TLS handshake failed: {e}"))
}

fn extract_server_public_key(
    tls_stream: &tokio_rustls::client::TlsStream<TcpStream>,
) -> Result<Vec<u8>, String> {
    use x509_cert::der::Decode as _;

    let (_, session) = tls_stream.get_ref();
    let cert_der = session
        .peer_certificates()
        .and_then(|certs| certs.first())
        .ok_or_else(|| "RDP server sent no TLS certificate".to_string())?;

    let cert = x509_cert::Certificate::from_der(cert_der.as_ref())
        .map_err(|e| format!("failed to parse server certificate: {e}"))?;

    let spki_bytes = cert
        .tbs_certificate
        .subject_public_key_info
        .subject_public_key
        .as_bytes()
        .ok_or_else(|| "server certificate subject public key is not a bitstring".to_string())?
        .to_vec();

    Ok(spki_bytes)
}

// ── Connect helper ────────────────────────────────────────────────────────────

type UpgradedFramed = ironrdp_tokio::TokioFramed<tokio_rustls::client::TlsStream<TcpStream>>;

async fn rdp_connect(
    host: String,
    port: u16,
    username: String,
    password: String,
    domain: Option<String>,
    width: u16,
    height: u16,
) -> Result<(ironrdp::connector::ConnectionResult, UpgradedFramed), String> {
    use ironrdp::connector::{
        ClientConnector, Config, Credentials, DesktopSize, ServerName,
        credssp::KerberosConfig,
    };
    use ironrdp::pdu::gcc::KeyboardType;
    use ironrdp::pdu::rdp::capability_sets::MajorPlatformType;
    use ironrdp_tokio::{TokioFramed, connect_begin, connect_finalize, mark_as_upgraded};

    // Step 1: TCP connect + create framed
    let stream = TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| format!("TCP connect to {host}:{port} failed: {e}"))?;
    let client_addr = stream.local_addr().map_err(|e| e.to_string())?;
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
    let mut connector = ClientConnector::new(config, client_addr);
    let should_upgrade = connect_begin(&mut framed, &mut connector)
        .await
        .map_err(|e| format!("RDP connect_begin failed: {e}"))?;

    // Step 4: Extract inner stream
    let (tcp_stream, leftover) = framed.into_inner();

    // Step 5: TLS upgrade
    let tls_stream = tls_upgrade(tcp_stream, &host).await?;

    // Step 6: Extract server public key
    let server_public_key = extract_server_public_key(&tls_stream)?;

    // Step 7: Mark as upgraded
    let upgraded = mark_as_upgraded(should_upgrade, &mut connector);

    // Step 8: Create upgraded framed over the concrete TLS stream
    let mut upgraded_framed: UpgradedFramed = TokioFramed::new_with_leftover(tls_stream, leftover);

    // Step 9: Finalize
    let connection_result = connect_finalize::<_, NoopNetworkClient>(
        upgraded,
        connector,
        &mut upgraded_framed,
        &mut NoopNetworkClient,
        ServerName::new(host),
        server_public_key,
        None::<KerberosConfig>,
    )
    .await
    .map_err(|e| format!("RDP connect_finalize failed: {e}"))?;

    Ok((connection_result, upgraded_framed))
}

// ── Event loop ────────────────────────────────────────────────────────────────

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
        eprintln!("[rdp {session_id}] event loop starting");

        let width = connection_result.desktop_size.width;
        let height = connection_result.desktop_size.height;

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

        use ironrdp_tokio::FramedWrite as _;

        loop {
            tokio::select! {
                _ = &mut stop => {
                    eprintln!("[rdp {session_id}] stop signal received");
                    break;
                }
                input = input_rx.recv() => {
                    match input {
                        Some(rdp_input) => {
                            if let Err(e) = send_rdp_input(&mut framed, &mut input_db, &mut last_button_mask, rdp_input).await {
                                eprintln!("[rdp {session_id}] send_rdp_input error: {e}");
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
                                    eprintln!("[rdp {session_id}] active_stage.process error: {e}");
                                    emit_rdp_event(&app, RdpCanvasEvent::Error {
                                        session_id: session_id.clone(),
                                        message: e.to_string(),
                                    });
                                    break;
                                }
                            };

                            let mut should_break = false;
                            for output in outputs {
                                use ironrdp::session::ActiveStageOutput;
                                match output {
                                    ActiveStageOutput::ResponseFrame(frame) => {
                                        if let Err(e) = framed.write_all(&frame).await {
                                            eprintln!("[rdp {session_id}] write_all error: {e}");
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
                                        should_break = true;
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                            if should_break {
                                break;
                            }
                        }
                        Err(e) => {
                            eprintln!("[rdp {session_id}] read_pdu error: {e}");
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
    db: &mut ironrdp::input::Database,
    last_button_mask: &mut u8,
    input: RdpInput,
) -> Result<(), String> {
    use ironrdp::input::{MousePosition, Operation, Scancode, WheelRotations};
    use ironrdp_tokio::FramedWrite as _;

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
    let bytes = ironrdp::core::encode_vec(&pdu).map_err(|e| format!("failed to encode RDP input: {e}"))?;
    framed
        .write_all(&bytes)
        .await
        .map_err(|e| format!("failed to send RDP input: {e}"))?;
    Ok(())
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
