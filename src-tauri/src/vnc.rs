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
    sync::oneshot,
    time,
};
use vnc::{
    ClientKeyEvent, ClientMouseEvent, PixelFormat, VncConnector, VncEncoding, VncEvent, X11Event,
};

const DEFAULT_VNC_PORT: u16 = 5900;
const REFRESH_INTERVAL: Duration = Duration::from_millis(33);

pub struct VncSessionManager {
    runtime: Runtime,
    sessions: Mutex<HashMap<String, VncSession>>,
}

struct VncSession {
    client: vnc::VncClient,
    stop: Option<oneshot::Sender<()>>,
    connected: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartVncSessionRequest {
    session_id: String,
    host: String,
    port: Option<u16>,
    secret_owner_id: Option<String>,
    password: Option<String>,
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
#[serde(rename_all = "camelCase", tag = "kind")]
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
        let address = self.runtime.block_on(resolve_vnc_address(&host, port))?;
        let client = self.runtime.block_on(connect_vnc(address, password))?;
        let (stop_tx, stop_rx) = oneshot::channel();
        spawn_vnc_event_loop(
            &self.runtime,
            app,
            session_id.clone(),
            client.clone(),
            stop_rx,
        );

        let mut sessions = self.lock_sessions()?;
        sessions.insert(
            session_id.clone(),
            VncSession {
                client,
                stop: Some(stop_tx),
                connected: true,
            },
        );

        Ok(VncSessionStarted {
            session_id,
            host,
            port,
        })
    }

    pub fn pointer_event(&self, request: VncPointerEventRequest) -> Result<(), String> {
        let client = self.client_for(&request.session_id)?;
        self.runtime
            .block_on(client.input(X11Event::PointerEvent(ClientMouseEvent {
                position_x: request.x,
                position_y: request.y,
                bottons: request.button_mask,
            })))
            .map_err(to_vnc_error)
    }

    pub fn key_event(&self, request: VncKeyEventRequest) -> Result<(), String> {
        let client = self.client_for(&request.session_id)?;
        self.runtime
            .block_on(client.input(X11Event::KeyEvent(ClientKeyEvent {
                keycode: request.key,
                down: request.down,
            })))
            .map_err(to_vnc_error)
    }

    pub fn refresh(&self, request: VncSimpleRequest) -> Result<(), String> {
        let client = self.client_for(&request.session_id)?;
        self.runtime
            .block_on(client.input(X11Event::FullRefresh))
            .map_err(to_vnc_error)
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

    fn client_for(&self, session_id: &str) -> Result<vnc::VncClient, String> {
        let sessions = self.lock_sessions()?;
        sessions
            .get(session_id)
            .map(|session| session.client.clone())
            .ok_or_else(|| format!("VNC session '{session_id}' was not found"))
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
    let mut addresses = lookup_host((host, port))
        .await
        .map_err(|error| format!("failed to resolve VNC host '{host}': {error}"))?;
    addresses
        .next()
        .ok_or_else(|| format!("VNC host '{host}' did not resolve to an address"))
}

async fn connect_vnc(
    address: SocketAddr,
    password: Option<String>,
) -> Result<vnc::VncClient, String> {
    let stream = TcpStream::connect(address)
        .await
        .map_err(|error| format!("failed to connect to VNC server {address}: {error}"))?;
    let password = Arc::new(password.unwrap_or_default());
    let password_for_auth = Arc::clone(&password);
    VncConnector::new(stream)
        .set_auth_method(async move { Ok((*password_for_auth).clone()) })
        .add_encoding(VncEncoding::Zrle)
        .add_encoding(VncEncoding::CopyRect)
        .add_encoding(VncEncoding::Raw)
        .allow_shared(true)
        .set_pixel_format(PixelFormat::rgba())
        .build()
        .map_err(to_vnc_error)?
        .try_start()
        .await
        .map_err(to_vnc_error)?
        .finish()
        .map_err(to_vnc_error)
}

fn spawn_vnc_event_loop(
    runtime: &Runtime,
    app: AppHandle,
    session_id: String,
    client: vnc::VncClient,
    mut stop: oneshot::Receiver<()>,
) {
    runtime.spawn(async move {
        let _ = app.emit(
            "vnc-session-event",
            VncSessionEvent::Connected {
                session_id: session_id.clone(),
                name: "VNC".to_string(),
            },
        );
        let mut refresh_interval = time::interval(REFRESH_INTERVAL);
        loop {
            tokio::select! {
                _ = &mut stop => {
                    let _ = client.close().await;
                    break;
                }
                _ = refresh_interval.tick() => {
                    if let Err(error) = client.input(X11Event::Refresh).await {
                        emit_vnc_event(&app, VncSessionEvent::Error {
                            session_id: session_id.clone(),
                            message: to_vnc_error(error),
                        });
                        break;
                    }
                }
                event = client.recv_event() => {
                    match event {
                        Ok(event) => handle_vnc_event(&app, &session_id, event),
                        Err(error) => {
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
        emit_vnc_event(&app, VncSessionEvent::Disconnected { session_id });
    });
}

fn handle_vnc_event(app: &AppHandle, session_id: &str, event: VncEvent) {
    match event {
        VncEvent::SetResolution(screen) => emit_vnc_event(
            app,
            VncSessionEvent::Resolution {
                session_id: session_id.to_string(),
                width: screen.width,
                height: screen.height,
            },
        ),
        VncEvent::RawImage(rect, data) => emit_vnc_event(
            app,
            VncSessionEvent::RawImage {
                session_id: session_id.to_string(),
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                rgba: BASE64.encode(data),
            },
        ),
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
        VncEvent::SetPixelFormat(_) | VncEvent::JpegImage(_, _) | VncEvent::SetCursor(_, _) => {}
        _ => {}
    }
}

fn emit_vnc_event(app: &AppHandle, event: VncSessionEvent) {
    let _ = app.emit("vnc-session-event", event);
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
}
