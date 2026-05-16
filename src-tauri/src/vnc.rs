use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex, MutexGuard},
    time::Duration,
};
use tauri::{AppHandle, Emitter};
use tokio::{
    net::{lookup_host, TcpStream},
    runtime::Runtime,
    sync::{mpsc, oneshot},
    time,
};
use vnc::{
    ClientKeyEvent, ClientMouseEvent, PixelFormat, VncConnector, VncEncoding, VncEvent, X11Event,
};

const DEFAULT_VNC_PORT: u16 = 5900;
const REFRESH_INTERVAL: Duration = Duration::from_millis(16);
const VNC_RESOLVE_TIMEOUT: Duration = Duration::from_secs(5);
const VNC_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const X11_CONTROL_LEFT: u32 = 0xffe3;
const X11_ALT_LEFT: u32 = 0xffe9;
const X11_DELETE: u32 = 0xffff;

pub struct VncSessionManager {
    runtime: Runtime,
    sessions: Mutex<HashMap<String, VncSession>>,
}

struct VncSession {
    client: vnc::VncClient,
    input: mpsc::UnboundedSender<X11Event>,
    stop: Option<oneshot::Sender<()>>,
    connected: bool,
    view_only: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartVncSessionRequest {
    session_id: String,
    host: String,
    port: Option<u16>,
    secret_owner_id: Option<String>,
    password: Option<String>,
    options: Option<VncSessionOptions>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VncSessionOptions {
    #[serde(default = "default_true")]
    shared_session: bool,
    #[serde(default)]
    view_only: bool,
    #[serde(default = "default_vnc_color_level")]
    color_level: String,
    #[serde(default = "default_vnc_preferred_encoding")]
    preferred_encoding: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VncSessionStarted {
    session_id: String,
    host: String,
    port: u16,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VncSessionStatus {
    session_id: String,
    connected: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VncPointerEventRequest {
    session_id: String,
    x: u16,
    y: u16,
    button_mask: u8,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VncKeyEventRequest {
    session_id: String,
    key: u32,
    down: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VncSimpleRequest {
    session_id: String,
}

#[derive(Clone, Serialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    tag = "kind"
)]
enum VncSessionEvent {
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
    Copy {
        session_id: String,
        x: u16,
        y: u16,
        width: u16,
        height: u16,
        source_x: u16,
        source_y: u16,
    },
    Bell {
        session_id: String,
    },
    SetCursor {
        session_id: String,
        width: u16,
        height: u16,
        hot_x: u16,
        hot_y: u16,
        rgba: String,
    },
    ClipboardText {
        session_id: String,
        text: String,
    },
    Error {
        session_id: String,
        message: String,
    },
    Disconnected {
        session_id: String,
    },
}

impl VncSessionManager {
    pub fn new() -> Self {
        Self {
            runtime: Runtime::new().expect("VNC runtime initializes"),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn start_session(
        &self,
        app: AppHandle,
        request: StartVncSessionRequest,
    ) -> Result<VncSessionStarted, String> {
        let session_id = required_id(request.session_id)?;
        let host = required_field("VNC host", request.host)?;
        let port = request.port.unwrap_or(DEFAULT_VNC_PORT);
        if port == 0 {
            return Err("VNC port must be between 1 and 65535".to_string());
        }

        {
            let sessions = self.lock_sessions()?;
            if sessions.contains_key(&session_id) {
                return Err(format!("VNC session '{session_id}' is already running"));
            }
        }

        let password = request.password.clone();
        let options = request.options.unwrap_or_default();
        let address = self.runtime.block_on(resolve_vnc_address(&host, port))?;
        let client = self
            .runtime
            .block_on(connect_vnc(address, password, &options))?;
        let (stop_tx, stop_rx) = oneshot::channel();
        let (input_tx, input_rx) = mpsc::unbounded_channel();
        spawn_vnc_event_loop(
            &self.runtime,
            app,
            session_id.clone(),
            client.clone(),
            input_rx,
            stop_rx,
        );

        let mut sessions = self.lock_sessions()?;
        sessions.insert(
            session_id.clone(),
            VncSession {
                client,
                input: input_tx,
                stop: Some(stop_tx),
                connected: true,
                view_only: options.view_only,
            },
        );

        Ok(VncSessionStarted {
            session_id,
            host,
            port,
        })
    }

    pub fn pointer_event(&self, request: VncPointerEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            X11Event::PointerEvent(ClientMouseEvent {
                position_x: request.x,
                position_y: request.y,
                bottons: request.button_mask,
            }),
        )
    }

    pub fn key_event(&self, request: VncKeyEventRequest) -> Result<(), String> {
        self.queue_input(
            &request.session_id,
            X11Event::KeyEvent(ClientKeyEvent {
                keycode: request.key,
                down: request.down,
            }),
        )
    }

    pub fn send_ctrl_alt_delete(&self, request: VncSimpleRequest) -> Result<(), String> {
        let session_id = request.session_id;
        self.queue_input(&session_id, key_input(X11_CONTROL_LEFT, true))?;
        self.queue_input(&session_id, key_input(X11_ALT_LEFT, true))?;
        self.queue_input(&session_id, key_input(X11_DELETE, true))?;
        self.queue_input(&session_id, key_input(X11_DELETE, false))?;
        self.queue_input(&session_id, key_input(X11_ALT_LEFT, false))?;
        self.queue_input(&session_id, key_input(X11_CONTROL_LEFT, false))
    }

    pub fn refresh(&self, request: VncSimpleRequest) -> Result<(), String> {
        self.queue_input(&request.session_id, X11Event::FullRefresh)
    }

    pub fn close_session(&self, request: VncSimpleRequest) -> Result<(), String> {
        let mut sessions = self.lock_sessions()?;
        if let Some(mut session) = sessions.remove(&request.session_id) {
            if let Some(stop) = session.stop.take() {
                let _ = stop.send(());
            }
            let _ = self.runtime.block_on(session.client.close());
        }
        Ok(())
    }

    pub fn session_status(&self, request: VncSimpleRequest) -> Result<VncSessionStatus, String> {
        let sessions = self.lock_sessions()?;
        let connected = sessions
            .get(&request.session_id)
            .map(|session| session.connected)
            .unwrap_or(false);
        Ok(VncSessionStatus {
            session_id: request.session_id,
            connected,
        })
    }

    fn queue_input(&self, session_id: &str, event: X11Event) -> Result<(), String> {
        let sessions = self.lock_sessions()?;
        let input = sessions
            .get(session_id)
            .and_then(|session| {
                if session.view_only {
                    None
                } else {
                    Some(session.input.clone())
                }
            })
            .ok_or_else(|| format!("VNC session '{session_id}' was not found"))?;
        input
            .send(event)
            .map_err(|_| format!("VNC session '{session_id}' input channel is closed"))
    }

    fn lock_sessions(&self) -> Result<MutexGuard<'_, HashMap<String, VncSession>>, String> {
        self.sessions
            .lock()
            .map_err(|_| "VNC session lock is poisoned".to_string())
    }
}

impl StartVncSessionRequest {
    pub(crate) fn secret_owner_id(&self) -> Option<&str> {
        self.secret_owner_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
    }

    pub(crate) fn password(&self) -> Option<&str> {
        self.password.as_deref().filter(|value| !value.is_empty())
    }

    pub(crate) fn set_password(&mut self, password: Option<String>) {
        self.password = password;
    }
}

async fn resolve_vnc_address(host: &str, port: u16) -> Result<SocketAddr, String> {
    let mut addresses = time::timeout(VNC_RESOLVE_TIMEOUT, lookup_host((host, port)))
        .await
        .map_err(|_| format!("timed out resolving VNC host '{host}'"))?
        .map_err(|error| format!("failed to resolve VNC host '{host}': {error}"))?;
    addresses
        .next()
        .ok_or_else(|| format!("VNC host '{host}' did not resolve to an address"))
}

async fn connect_vnc(
    address: SocketAddr,
    password: Option<String>,
    options: &VncSessionOptions,
) -> Result<vnc::VncClient, String> {
    connect_vnc_with_timeout(address, password, options, VNC_CONNECT_TIMEOUT).await
}

async fn connect_vnc_with_timeout(
    address: SocketAddr,
    password: Option<String>,
    options: &VncSessionOptions,
    timeout: Duration,
) -> Result<vnc::VncClient, String> {
    time::timeout(timeout, connect_vnc_unbounded(address, password, options))
        .await
        .map_err(|_| format!("timed out connecting to VNC server {address}"))?
}

async fn connect_vnc_unbounded(
    address: SocketAddr,
    password: Option<String>,
    options: &VncSessionOptions,
) -> Result<vnc::VncClient, String> {
    let stream = TcpStream::connect(address)
        .await
        .map_err(|error| format!("failed to connect to VNC server {address}: {error}"))?;
    let password = Arc::new(password.unwrap_or_default());
    let password_for_auth = Arc::clone(&password);
    let pixel_format = pixel_format_for(&options.color_level);
    let mut connector = VncConnector::new(stream)
        .set_auth_method(async move { Ok((*password_for_auth).clone()) })
        .allow_shared(options.shared_session)
        .set_pixel_format(pixel_format);
    connector = match options.preferred_encoding.as_str() {
        "raw" => connector
            .add_encoding(VncEncoding::Raw)
            .add_encoding(VncEncoding::Tight)
            .add_encoding(VncEncoding::Zrle),
        "zrle" => connector
            .add_encoding(VncEncoding::Zrle)
            .add_encoding(VncEncoding::Tight)
            .add_encoding(VncEncoding::Raw),
        _ => connector
            .add_encoding(VncEncoding::Tight)
            .add_encoding(VncEncoding::Zrle)
            .add_encoding(VncEncoding::Raw),
    };
    connector = connector.add_encoding(VncEncoding::CopyRect);
    if pixel_format.bits_per_pixel == 32 {
        connector = connector.add_encoding(VncEncoding::CursorPseudo);
    }
    connector
        .add_encoding(VncEncoding::DesktopSizePseudo)
        .build()
        .map_err(to_vnc_error)?
        .try_start()
        .await
        .map_err(to_vnc_error)?
        .finish()
        .map_err(to_vnc_error)
}

fn key_input(keycode: u32, down: bool) -> X11Event {
    X11Event::KeyEvent(ClientKeyEvent { keycode, down })
}

impl Default for VncSessionOptions {
    fn default() -> Self {
        Self {
            shared_session: true,
            view_only: false,
            color_level: default_vnc_color_level(),
            preferred_encoding: default_vnc_preferred_encoding(),
        }
    }
}

fn default_true() -> bool {
    true
}

fn default_vnc_color_level() -> String {
    "full".to_string()
}

fn default_vnc_preferred_encoding() -> String {
    "tight".to_string()
}

fn pixel_format_for(color_level: &str) -> PixelFormat {
    match color_level {
        "256" => reduced_pixel_format(8, 7, 7, 3, 5, 2, 0),
        "64" => reduced_pixel_format(6, 3, 3, 3, 4, 2, 0),
        "8" => reduced_pixel_format(3, 1, 1, 1, 2, 1, 0),
        _ => PixelFormat::rgba(),
    }
}

fn reduced_pixel_format(
    depth: u8,
    red_max: u16,
    green_max: u16,
    blue_max: u16,
    red_shift: u8,
    green_shift: u8,
    blue_shift: u8,
) -> PixelFormat {
    let mut format = PixelFormat::rgba();
    format.bits_per_pixel = 8;
    format.depth = depth;
    format.big_endian_flag = 0;
    format.true_color_flag = 1;
    format.red_max = red_max;
    format.green_max = green_max;
    format.blue_max = blue_max;
    format.red_shift = red_shift;
    format.green_shift = green_shift;
    format.blue_shift = blue_shift;
    format
}

fn spawn_vnc_event_loop(
    runtime: &Runtime,
    app: AppHandle,
    session_id: String,
    client: vnc::VncClient,
    mut input_rx: mpsc::UnboundedReceiver<X11Event>,
    mut stop: oneshot::Receiver<()>,
) {
    runtime.spawn(async move {
        eprintln!("[vnc {session_id}] event loop starting");
        emit_vnc_event(
            &app,
            VncSessionEvent::Connected {
                session_id: session_id.clone(),
                name: "VNC".to_string(),
            },
        );
        if let Err(error) = client.input(X11Event::FullRefresh).await {
            eprintln!("[vnc {session_id}] initial FullRefresh failed: {error}");
            emit_vnc_event(
                &app,
                VncSessionEvent::Error {
                    session_id: session_id.clone(),
                    message: to_vnc_error(error),
                },
            );
            emit_vnc_event(&app, VncSessionEvent::Disconnected { session_id });
            return;
        }
        let mut refresh_interval = time::interval(REFRESH_INTERVAL);
        refresh_interval.set_missed_tick_behavior(time::MissedTickBehavior::Delay);
        // Skip the immediate first tick so we don't race the FullRefresh above with an incremental Refresh.
        refresh_interval.tick().await;
        let mut pixel_format = PixelFormat::rgba();
        loop {
            tokio::select! {
                _ = &mut stop => {
                    eprintln!("[vnc {session_id}] stop signal received");
                    let _ = client.close().await;
                    break;
                }
                _ = refresh_interval.tick() => {
                    if let Err(error) = client.input(X11Event::Refresh).await {
                        eprintln!("[vnc {session_id}] refresh input failed: {error}");
                        emit_vnc_event(&app, VncSessionEvent::Error {
                            session_id: session_id.clone(),
                            message: to_vnc_error(error),
                        });
                        break;
                    }
                }
                input = input_rx.recv() => {
                    match input {
                        Some(input) => {
                            if let Err(error) = client.input(input).await {
                                eprintln!("[vnc {session_id}] queued input failed: {error}");
                                emit_vnc_event(&app, VncSessionEvent::Error {
                                    session_id: session_id.clone(),
                                    message: to_vnc_error(error),
                                });
                                break;
                            }
                        }
                        None => break,
                    }
                }
                event = client.recv_event() => {
                    match event {
                        Ok(VncEvent::SetPixelFormat(format)) => {
                            pixel_format = format;
                        }
                        Ok(event) => handle_vnc_event(&app, &session_id, event, pixel_format),
                        Err(error) => {
                            eprintln!("[vnc {session_id}] recv_event failed: {error}");
                            emit_vnc_event(&app, VncSessionEvent::Error {
                                session_id: session_id.clone(),
                                message: to_vnc_error(error),
                            });
                            break;
                        }
                    }
                }
            }
        }
        eprintln!("[vnc {session_id}] event loop exiting");
        emit_vnc_event(&app, VncSessionEvent::Disconnected { session_id });
    });
}

fn handle_vnc_event(app: &AppHandle, session_id: &str, event: VncEvent, pixel_format: PixelFormat) {
    match event {
        VncEvent::SetResolution(screen) => emit_vnc_event(
            app,
            VncSessionEvent::Resolution {
                session_id: session_id.to_string(),
                width: screen.width,
                height: screen.height,
            },
        ),
        VncEvent::RawImage(rect, data) => {
            let rgba = raw_pixels_to_rgba(&data, pixel_format);
            emit_vnc_event(
                app,
                VncSessionEvent::RawImage {
                    session_id: session_id.to_string(),
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    rgba: BASE64.encode(rgba),
                },
            )
        }
        VncEvent::Copy(dst, src) => emit_vnc_event(
            app,
            VncSessionEvent::Copy {
                session_id: session_id.to_string(),
                x: dst.x,
                y: dst.y,
                width: dst.width,
                height: dst.height,
                source_x: src.x,
                source_y: src.y,
            },
        ),
        VncEvent::Bell => emit_vnc_event(
            app,
            VncSessionEvent::Bell {
                session_id: session_id.to_string(),
            },
        ),
        VncEvent::Text(text) => emit_vnc_event(
            app,
            VncSessionEvent::ClipboardText {
                session_id: session_id.to_string(),
                text,
            },
        ),
        VncEvent::Error(message) => emit_vnc_event(
            app,
            VncSessionEvent::Error {
                session_id: session_id.to_string(),
                message,
            },
        ),
        VncEvent::SetCursor(rect, data) => emit_vnc_event(
            app,
            VncSessionEvent::SetCursor {
                session_id: session_id.to_string(),
                width: rect.width,
                height: rect.height,
                hot_x: rect.x,
                hot_y: rect.y,
                rgba: BASE64.encode(data),
            },
        ),
        VncEvent::SetPixelFormat(_) | VncEvent::JpegImage(_, _) => {}
        _ => {}
    }
}

fn emit_vnc_event(app: &AppHandle, event: VncSessionEvent) {
    let _ = app.emit("vnc-session-event", event);
}

fn raw_pixels_to_rgba(data: &[u8], format: PixelFormat) -> Vec<u8> {
    let bytes_per_pixel = usize::from(format.bits_per_pixel / 8);
    if bytes_per_pixel == 0 {
        return Vec::new();
    }
    let mut rgba = Vec::with_capacity((data.len() / bytes_per_pixel) * 4);
    for pixel in data.chunks_exact(bytes_per_pixel) {
        let value = pixel_value(pixel, format.big_endian_flag != 0);
        rgba.push(scale_color_component(
            (value >> format.red_shift) & u32::from(format.red_max),
            format.red_max,
        ));
        rgba.push(scale_color_component(
            (value >> format.green_shift) & u32::from(format.green_max),
            format.green_max,
        ));
        rgba.push(scale_color_component(
            (value >> format.blue_shift) & u32::from(format.blue_max),
            format.blue_max,
        ));
        rgba.push(255);
    }
    rgba
}

fn pixel_value(pixel: &[u8], big_endian: bool) -> u32 {
    let mut value = 0_u32;
    if big_endian {
        for byte in pixel {
            value = (value << 8) | u32::from(*byte);
        }
    } else {
        for (index, byte) in pixel.iter().enumerate() {
            value |= u32::from(*byte) << (index * 8);
        }
    }
    value
}

fn scale_color_component(value: u32, max: u16) -> u8 {
    if max == 0 {
        return 0;
    }
    ((value * 255) / u32::from(max)) as u8
}

fn to_vnc_error(error: impl std::fmt::Display) -> String {
    format!("VNC error: {error}")
}

fn required_id(value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("VNC session id is required".to_string());
    }
    if trimmed.len() > 96 {
        return Err("VNC session id must be 96 characters or fewer".to_string());
    }
    if !trimmed
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("VNC session id may only contain letters, digits, '-' or '_'".to_string());
    }
    Ok(trimmed.to_string())
}

fn required_field(label: &str, value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{label} is required"));
    }
    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_vnc_session_ids() {
        assert_eq!(
            required_id("vnc-session_1".to_string()).as_deref(),
            Ok("vnc-session_1")
        );
        assert!(required_id("bad/session".to_string()).is_err());
    }

    #[test]
    fn uses_standard_vnc_port_when_missing() {
        assert_eq!(DEFAULT_VNC_PORT, 5900);
    }

    #[test]
    fn vnc_connect_timeout_covers_unresponsive_server() {
        let runtime = Runtime::new().expect("runtime starts");
        runtime.block_on(async {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                .await
                .expect("listener binds");
            let address = listener.local_addr().expect("listener has address");
            let server = tokio::spawn(async move {
                let _accepted = listener.accept().await;
                time::sleep(Duration::from_millis(250)).await;
            });

            let result = connect_vnc_with_timeout(
                address,
                None,
                &VncSessionOptions::default(),
                Duration::from_millis(25),
            )
            .await;
            server.abort();

            assert_eq!(
                result.as_ref().map(|_| ()),
                Err(&format!("timed out connecting to VNC server {address}"))
            );
        });
    }

    #[test]
    fn serializes_raw_image_as_base64_rgba() {
        let event = VncSessionEvent::RawImage {
            session_id: "vnc-1".to_string(),
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            rgba: BASE64.encode([255, 0, 0, 255]),
        };
        let value = serde_json::to_value(event).expect("event serializes");
        assert_eq!(value["kind"], "rawImage");
        assert_eq!(value["rgba"], "/wAA/w==");
    }

    #[test]
    fn vnc_color_level_selects_matching_pixel_format() {
        assert_eq!(pixel_format_for("full").bits_per_pixel, 32);
        assert_eq!(pixel_format_for("256").depth, 8);
        assert_eq!(pixel_format_for("64").depth, 6);
        assert_eq!(pixel_format_for("8").depth, 3);
    }

    #[test]
    fn converts_reduced_vnc_pixels_to_rgba() {
        let rgb332 = pixel_format_for("256");
        assert_eq!(
            raw_pixels_to_rgba(&[0b1110_0011, 0], rgb332),
            vec![255, 0, 255, 255, 0, 0, 0, 255]
        );
    }
}
