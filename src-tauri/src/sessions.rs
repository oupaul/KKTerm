#[cfg(target_os = "windows")]
use crate::windows_local_pty;
use crate::{secrets, serial, ssh, storage, telnet, x_server};
use portable_pty::{Child, CommandBuilder, MasterPty, PtySize, native_pty_system};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    ffi::OsString,
    fs::{self, File},
    io::{Read, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener as StdTcpListener},
    path::PathBuf,
    process::Command as ProcessCommand,
    sync::Mutex,
    thread::{self, JoinHandle},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::oneshot,
};

pub struct SessionManager {
    sessions: Mutex<HashMap<String, TerminalSession>>,
    recordings: TerminalRecordingManager,
    ssh_context_cache: Mutex<HashMap<String, Result<String, String>>>,
    os_detect_cache: Mutex<HashMap<String, DetectedRemoteOs>>,
    ssh_port_forwards: Mutex<HashMap<String, SshPortForwardSession>>,
}

struct TerminalSession {
    transport: TerminalTransport,
}

struct SshPortForwardSession {
    stop: Option<oneshot::Sender<()>>,
    worker: Option<JoinHandle<()>>,
}

impl Drop for SshPortForwardSession {
    fn drop(&mut self) {
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

enum TerminalTransport {
    Pty {
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        child: Box<dyn Child + Send + Sync>,
    },
    NativeSsh(ssh::NativeSshTerminal),
    NativeTelnet(telnet::NativeTelnetTerminal),
    NativeSerial(serial::NativeSerialTerminal),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTerminalSessionRequest {
    pub session_id: Option<String>,
    pub title: String,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub host: String,
    pub user: String,
    pub port: Option<u16>,
    pub key_path: Option<String>,
    pub proxy_jump: Option<String>,
    pub ssh_socks_proxy: Option<String>,
    pub auth_method: Option<String>,
    pub secret_owner_id: Option<String>,
    pub shell: Option<String>,
    pub serial_line: Option<String>,
    pub serial_speed: Option<u32>,
    pub initial_directory: Option<String>,
    pub cols: Option<u16>,
    pub pixel_height: Option<u16>,
    pub pixel_width: Option<u16>,
    pub rows: Option<u16>,
    pub use_tmux: Option<bool>,
    pub tmux_session_id: Option<String>,
    pub ssh_buffer_lines: Option<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TmuxConnectionRequest {
    pub host: String,
    pub user: String,
    pub port: Option<u16>,
    pub key_path: Option<String>,
    pub proxy_jump: Option<String>,
    pub ssh_socks_proxy: Option<String>,
    pub auth_method: Option<String>,
    pub secret_owner_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseTmuxSessionRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub tmux_session_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameTmuxSessionRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub tmux_session_id: String,
    pub new_tmux_session_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureTmuxPaneRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub tmux_session_id: String,
    pub buffer_lines: Option<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetTmuxSessionMouseRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub tmux_session_id: String,
    pub enabled: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrollTmuxPaneRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub tmux_session_id: String,
    pub lines: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSshPortForwardRequest {
    #[serde(flatten)]
    pub connection: TmuxConnectionRequest,
    pub remote_port: u16,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseSshPortForwardRequest {
    pub forward_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteLoopbackPort {
    pub port: u16,
    pub address: String,
}

/// Raw remote-OS facts gathered on first SSH connect for icon auto-detection.
/// The frontend maps these to a bundled distro/OS logo.
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedRemoteOs {
    pub id: Option<String>,
    pub id_like: Option<String>,
    pub kernel: Option<String>,
    pub model: Option<String>,
    pub app: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshPortForwardStarted {
    pub forward_id: String,
    pub local_port: u16,
    pub remote_port: u16,
    pub url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TmuxSession {
    pub id: String,
    pub attached: bool,
    pub windows: u32,
    pub created: Option<u64>,
    pub last_attached: Option<u64>,
    pub path: Option<String>,
    pub internal_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchElevatedTerminalRequest {
    pub shell: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSessionStarted {
    session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    terminal_ready_ms: Option<u128>,
    #[serde(skip_serializing_if = "Option::is_none")]
    x11_forwarding_status: Option<ssh::NativeSshX11ForwardingStatus>,
}

impl TerminalSessionStarted {
    pub fn terminal_ready_ms(&self) -> Option<u128> {
        self.terminal_ready_ms
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutput {
    pub(crate) session_id: String,
    pub(crate) data: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTerminalRecordingRequest {
    pub session_id: String,
    pub connection_id: String,
    pub connection_name: String,
    pub initial_buffer: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTerminalRecordingsRequest {
    pub connection_id: String,
    pub connection_name: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalRecordingInfo {
    pub session_id: String,
    pub connection_id: String,
    pub connection_name: String,
    pub started_at_millis: u128,
    pub path: PathBuf,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalRecordingEntry {
    pub file_name: String,
    pub path: PathBuf,
    pub size_bytes: u64,
    pub modified_at_millis: Option<u128>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalInputRequest {
    session_id: String,
    data: Vec<u8>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeTerminalRequest {
    session_id: String,
    cols: u16,
    pixel_height: Option<u16>,
    pixel_width: Option<u16>,
    rows: u16,
}

struct ActiveTerminalRecording {
    info: TerminalRecordingInfo,
    file: File,
}

pub struct TerminalRecordingManager {
    #[cfg(test)]
    root: Option<PathBuf>,
    active: Mutex<HashMap<String, ActiveTerminalRecording>>,
}

impl TerminalRecordingManager {
    fn new() -> Self {
        Self {
            #[cfg(test)]
            root: None,
            active: Mutex::new(HashMap::new()),
        }
    }

    #[cfg(test)]
    fn new_for_root(root: PathBuf) -> Self {
        Self {
            root: Some(root),
            active: Mutex::new(HashMap::new()),
        }
    }

    #[cfg(test)]
    fn root(&self) -> Result<PathBuf, String> {
        self.root
            .clone()
            .ok_or_else(|| "terminal recordings root is not configured".to_string())
    }

    fn start_recording_at(
        &self,
        root: PathBuf,
        request: StartTerminalRecordingRequest,
    ) -> Result<TerminalRecordingInfo, String> {
        self.start_recording_with_root(root, request)
    }

    #[cfg(test)]
    fn start_recording(
        &self,
        request: StartTerminalRecordingRequest,
    ) -> Result<TerminalRecordingInfo, String> {
        self.start_recording_with_root(self.root()?, request)
    }

    fn start_recording_with_root(
        &self,
        root: PathBuf,
        request: StartTerminalRecordingRequest,
    ) -> Result<TerminalRecordingInfo, String> {
        let session_id = required_recording_part("session id", &request.session_id)?;
        let connection_id = required_recording_part("connection id", &request.connection_id)?;
        let connection_name = request.connection_name.trim().to_string();
        let started_at_millis = current_unix_millis();
        let folder = self.connection_folder_at(root, &connection_id, &connection_name)?;
        fs::create_dir_all(&folder).map_err(|error| {
            format!(
                "failed to create terminal recordings folder {}: {error}",
                folder.display()
            )
        })?;
        let file_name = format!(
            "{}--{}.txt",
            recording_timestamp_file_part(started_at_millis),
            recording_id_fragment(&session_id, 12)
        );
        let path = folder.join(file_name);
        let mut file = File::create(&path).map_err(|error| {
            format!(
                "failed to create terminal recording {}: {error}",
                path.display()
            )
        })?;
        if !request.initial_buffer.is_empty() {
            file.write_all(request.initial_buffer.as_bytes())
                .map_err(|error| format!("failed to write terminal recording prelude: {error}"))?;
            if !request.initial_buffer.ends_with('\n') {
                file.write_all(b"\n").map_err(|error| {
                    format!("failed to write terminal recording separator: {error}")
                })?;
            }
        }
        file.flush().map_err(|error| {
            format!(
                "failed to flush terminal recording {}: {error}",
                path.display()
            )
        })?;

        let info = TerminalRecordingInfo {
            session_id: session_id.clone(),
            connection_id,
            connection_name,
            started_at_millis,
            path,
        };
        self.active
            .lock()
            .map_err(|_| "terminal recording lock is poisoned".to_string())?
            .insert(
                session_id,
                ActiveTerminalRecording {
                    info: info.clone(),
                    file,
                },
            );
        Ok(info)
    }

    fn stop_recording(&self, session_id: String) -> Result<Option<TerminalRecordingInfo>, String> {
        let recording = self
            .active
            .lock()
            .map_err(|_| "terminal recording lock is poisoned".to_string())?
            .remove(&session_id);
        if let Some(mut recording) = recording {
            recording.file.flush().map_err(|error| {
                format!(
                    "failed to flush terminal recording {}: {error}",
                    recording.info.path.display()
                )
            })?;
            Ok(Some(recording.info))
        } else {
            Ok(None)
        }
    }

    fn record_output(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut active = self
            .active
            .lock()
            .map_err(|_| "terminal recording lock is poisoned".to_string())?;
        let Some(recording) = active.get_mut(session_id) else {
            return Ok(());
        };
        recording
            .file
            .write_all(data.as_bytes())
            .map_err(|error| format!("failed to write terminal recording: {error}"))?;
        recording
            .file
            .flush()
            .map_err(|error| format!("failed to flush terminal recording: {error}"))
    }

    fn list_recordings_at(
        &self,
        root: PathBuf,
        request: ListTerminalRecordingsRequest,
    ) -> Result<Vec<TerminalRecordingEntry>, String> {
        let mut recordings = Vec::new();
        for folder in self.connection_recording_folders(
            root,
            &request.connection_id,
            &request.connection_name,
        )? {
            let entries = match fs::read_dir(&folder) {
                Ok(entries) => entries,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(error) => {
                    return Err(format!(
                        "failed to read terminal recordings folder {}: {error}",
                        folder.display()
                    ));
                }
            };
            recordings.extend(
                entries
                    .filter_map(Result::ok)
                    .filter_map(|entry| terminal_recording_entry(entry.path()).ok()),
            );
        }
        recordings.sort_by(|left, right| right.file_name.cmp(&left.file_name));
        Ok(recordings)
    }

    fn connection_recording_folders(
        &self,
        root: PathBuf,
        connection_id: &str,
        connection_name: &str,
    ) -> Result<Vec<PathBuf>, String> {
        let current = self.connection_folder_at(root.clone(), connection_id, connection_name)?;
        let id_fragment = recording_connection_id_fragment(connection_id);
        let mut folders = vec![current.clone()];
        let groups = match fs::read_dir(&root) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(folders),
            Err(error) => {
                return Err(format!(
                    "failed to read terminal recordings root {}: {error}",
                    root.display()
                ));
            }
        };
        for group in groups
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_dir())
        {
            let children = match fs::read_dir(group.path()) {
                Ok(entries) => entries,
                Err(_) => continue,
            };
            for child in children
                .filter_map(Result::ok)
                .filter(|entry| entry.path().is_dir())
            {
                let path = child.path();
                let name = path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or("");
                if name.ends_with(&format!("--{id_fragment}")) && !folders.contains(&path) {
                    folders.push(path);
                }
            }
        }
        Ok(folders)
    }

    fn connection_folder_at(
        &self,
        root: PathBuf,
        connection_id: &str,
        connection_name: &str,
    ) -> Result<PathBuf, String> {
        let name = recording_slug(connection_name);
        Ok(root
            .join(&name)
            .join(recording_folder_name(connection_id, connection_name)))
    }
}

fn terminal_recording_entry(path: PathBuf) -> Result<TerminalRecordingEntry, String> {
    if !path.is_file() || path.extension().and_then(|value| value.to_str()) != Some("txt") {
        return Err("not a terminal recording".to_string());
    }
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("failed to read terminal recording metadata: {error}"))?;
    let modified_at_millis = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis());
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("recording.txt")
        .to_string();
    Ok(TerminalRecordingEntry {
        file_name,
        path,
        size_bytes: metadata.len(),
        modified_at_millis,
    })
}

pub(crate) fn terminal_recordings_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?
        .join("terminal-recordings"))
}

pub(crate) fn emit_terminal_output(app: &AppHandle, session_id: &str, data: String) {
    if let Some(manager) = app.try_state::<SessionManager>() {
        let _ = manager.record_terminal_output(session_id, &data);
    }
    if let Some(tracker) =
        app.try_state::<std::sync::Arc<crate::watchdog::SessionActivityTracker>>()
    {
        tracker.record(session_id, data.as_bytes());
    }
    let _ = app.emit(
        "terminal-output",
        TerminalOutput {
            session_id: session_id.to_string(),
            data,
        },
    );
}

fn required_recording_part(label: &str, value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        Err(format!("terminal recording {label} is required"))
    } else {
        Ok(trimmed.to_string())
    }
}

fn recording_folder_name(connection_id: &str, connection_name: &str) -> String {
    format!(
        "{}--{}",
        recording_slug(connection_name),
        recording_connection_id_fragment(connection_id)
    )
}

fn recording_connection_id_fragment(value: &str) -> String {
    let normalized = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .collect::<String>();
    if let Some(rest) = normalized.strip_prefix("conn-") {
        let suffix = rest.chars().take(8).collect::<String>();
        if !suffix.is_empty() {
            return format!("conn-{suffix}");
        }
    }
    recording_id_fragment(&normalized, 8)
}

fn recording_slug(value: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;
    for character in value.trim().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            last_was_dash = false;
        } else if !last_was_dash && !slug.is_empty() {
            slug.push('-');
            last_was_dash = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        "connection".to_string()
    } else {
        slug
    }
}

fn recording_id_fragment(value: &str, max_len: usize) -> String {
    let fragment = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
        .take(max_len)
        .collect::<String>();
    if fragment.is_empty() {
        "session".to_string()
    } else {
        fragment
    }
}

fn current_unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn recording_timestamp_file_part(millis: u128) -> String {
    let seconds = (millis / 1_000) as i64;
    let offset = time::UtcOffset::current_local_offset().unwrap_or(time::UtcOffset::UTC);
    let timestamp = time::OffsetDateTime::from_unix_timestamp(seconds)
        .unwrap_or(time::OffsetDateTime::UNIX_EPOCH)
        .to_offset(offset);
    timestamp
        .format(&time::macros::format_description!(
            "[year][month][day]-[hour][minute][second]"
        ))
        .unwrap_or_else(|_| millis.to_string())
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            recordings: TerminalRecordingManager::new(),
            ssh_context_cache: Mutex::new(HashMap::new()),
            os_detect_cache: Mutex::new(HashMap::new()),
            ssh_port_forwards: Mutex::new(HashMap::new()),
        }
    }

    pub fn start_terminal_recording(
        &self,
        root: PathBuf,
        request: StartTerminalRecordingRequest,
    ) -> Result<TerminalRecordingInfo, String> {
        self.recordings.start_recording_at(root, request)
    }

    pub fn stop_terminal_recording(
        &self,
        session_id: String,
    ) -> Result<Option<TerminalRecordingInfo>, String> {
        self.recordings.stop_recording(session_id)
    }

    pub fn list_terminal_recordings(
        &self,
        root: PathBuf,
        request: ListTerminalRecordingsRequest,
    ) -> Result<Vec<TerminalRecordingEntry>, String> {
        self.recordings.list_recordings_at(root, request)
    }

    pub fn terminal_recordings_folder(
        &self,
        root: PathBuf,
        request: ListTerminalRecordingsRequest,
    ) -> Result<PathBuf, String> {
        self.recordings
            .connection_folder_at(root, &request.connection_id, &request.connection_name)
    }

    pub fn record_terminal_output(&self, session_id: &str, data: &str) -> Result<(), String> {
        self.recordings.record_output(session_id, data)
    }

    pub fn start_terminal_session(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: StartTerminalSessionRequest,
    ) -> Result<TerminalSessionStarted, String> {
        let session_id = request
            .session_id
            .clone()
            .unwrap_or_else(|| make_session_id(&request.title));
        let is_local_start = request.connection_type.trim().eq_ignore_ascii_case("local");
        let password = connection_password_for(secrets, &request);
        let mut managed_x_server_display = None;
        if request.connection_type.trim().eq_ignore_ascii_case("ssh") {
            let settings = app.state::<storage::Storage>().ssh_settings()?;
            if settings.managed_x_server_enabled() {
                let launch_result = x_server::launch_vcxsrv_if_needed(
                    settings.x_server_path(),
                    settings.x_server_display(),
                    Some(settings.x_server_args()),
                )?;
                managed_x_server_display = Some(launch_result.display);
            }
        }
        if request
            .connection_type
            .trim()
            .eq_ignore_ascii_case("telnet")
        {
            // A blank password is allowed: the user answers the remote login
            // prompt interactively in the terminal instead.
            let password = password.unwrap_or_default();
            let session = telnet::start_native_terminal(
                app,
                telnet::NativeTelnetTerminalRequest {
                    session_id: session_id.clone(),
                    host: request.host.clone(),
                    user: request.user.clone(),
                    port: request.port.unwrap_or(23),
                    password,
                },
            )?;
            self.sessions
                .lock()
                .map_err(|_| "terminal session lock is poisoned".to_string())?
                .insert(
                    session_id.clone(),
                    TerminalSession {
                        transport: TerminalTransport::NativeTelnet(session),
                    },
                );
            return Ok(TerminalSessionStarted {
                session_id,
                terminal_ready_ms: None,
                x11_forwarding_status: None,
            });
        }

        if request
            .connection_type
            .trim()
            .eq_ignore_ascii_case("serial")
        {
            let line = request
                .serial_line
                .clone()
                .unwrap_or_else(|| request.host.clone());
            let session = serial::start_native_terminal(
                app,
                serial::NativeSerialTerminalRequest {
                    session_id: session_id.clone(),
                    line,
                    speed: request
                        .serial_speed
                        .or(request.port.map(u32::from))
                        .unwrap_or(9600),
                },
            )?;
            self.sessions
                .lock()
                .map_err(|_| "terminal session lock is poisoned".to_string())?
                .insert(
                    session_id.clone(),
                    TerminalSession {
                        transport: TerminalTransport::NativeSerial(session),
                    },
                );
            return Ok(TerminalSessionStarted {
                session_id,
                terminal_ready_ms: None,
                x11_forwarding_status: None,
            });
        }

        let auth_method = ssh_auth_method_for(&request, password.as_deref())?;
        if uses_native_ssh(&request, password.as_deref(), &auth_method, true) {
            let known_hosts_path = ssh::app_known_hosts_path(&app)?;
            let auth = native_ssh_auth_for(&request, password, &auth_method)?;
            match ssh::start_native_terminal(
                app.clone(),
                ssh::NativeSshTerminalRequest {
                    session_id: session_id.clone(),
                    host: request.host.clone(),
                    user: request.user.clone(),
                    port: request.port.unwrap_or(22),
                    auth,
                    known_hosts_path,
                    cols: request.cols.unwrap_or(80),
                    pixel_height: request.pixel_height.unwrap_or(0),
                    pixel_width: request.pixel_width.unwrap_or(0),
                    rows: request.rows.unwrap_or(24),
                    initial_directory: request.initial_directory.clone(),
                    use_tmux: request.use_tmux.unwrap_or(false),
                    tmux_session_id: request.tmux_session_id.clone(),
                    tmux_history_limit: ssh_buffer_lines_for(request.ssh_buffer_lines),
                    x11_forwarding: managed_x_server_display
                        .map(|display| ssh::NativeSshX11Forwarding { display }),
                    socks_proxy: request.ssh_socks_proxy.clone(),
                },
            ) {
                Ok(session) => {
                    let terminal_ready_ms = session.terminal_ready_ms();
                    let x11_forwarding_status = session.x11_forwarding_status();
                    self.sessions
                        .lock()
                        .map_err(|_| "terminal session lock is poisoned".to_string())?
                        .insert(
                            session_id.clone(),
                            TerminalSession {
                                transport: TerminalTransport::NativeSsh(session),
                            },
                        );
                    return Ok(TerminalSessionStarted {
                        session_id,
                        terminal_ready_ms: Some(terminal_ready_ms),
                        x11_forwarding_status,
                    });
                }
                Err(error) if should_fallback_to_interactive_ssh(&error) => {
                    emit_terminal_output(
                        &app,
                        &session_id,
                        "\r\n[fallback: starting interactive ssh for username/password authentication]\r\n"
                            .to_string(),
                    );
                }
                Err(error) => return Err(error),
            }
        }

        #[cfg(target_os = "windows")]
        if is_local_start {
            let command = command_for(&request)?;
            let local_pty =
                windows_local_pty::spawn_local_shell(pty_size_for(&request), command)
                    .map_err(|error| format!("failed to start Windows local shell: {error}"))?;
            let session = TerminalSession {
                transport: TerminalTransport::Pty {
                    master: local_pty.master,
                    writer: local_pty.writer,
                    child: local_pty.child,
                },
            };
            self.sessions
                .lock()
                .map_err(|_| "terminal session lock is poisoned".to_string())?
                .insert(session_id.clone(), session);

            let output_session_id = session_id.clone();
            thread::spawn(move || {
                let mut reader = local_pty.reader;
                let mut buffer = [0_u8; 8192];
                loop {
                    match reader.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(count) => {
                            let data = String::from_utf8_lossy(&buffer[..count]).to_string();
                            emit_terminal_output(&app, &output_session_id, data);
                        }
                        Err(error) => {
                            emit_terminal_output(
                                &app,
                                &output_session_id,
                                format!("\r\n[session read error: {error}]\r\n"),
                            );
                            break;
                        }
                    }
                }
            });
            return Ok(TerminalSessionStarted {
                session_id,
                terminal_ready_ms: None,
                x11_forwarding_status: None,
            });
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(pty_size_for(&request))
            .map_err(|error| format!("failed to open PTY: {error}"))?;

        let command = command_for(&request)?;
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("failed to create PTY reader: {error}"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| format!("failed to create PTY writer: {error}"))?;
        let child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("failed to start terminal process: {error}"))?;
        drop(pair.slave);

        let session = TerminalSession {
            transport: TerminalTransport::Pty {
                master: pair.master,
                writer,
                child,
            },
        };
        self.sessions
            .lock()
            .map_err(|_| "terminal session lock is poisoned".to_string())?
            .insert(session_id.clone(), session);

        let output_session_id = session_id.clone();
        thread::spawn(move || {
            let mut buffer = [0_u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        let data = String::from_utf8_lossy(&buffer[..count]).to_string();
                        emit_terminal_output(&app, &output_session_id, data);
                    }
                    Err(error) => {
                        emit_terminal_output(
                            &app,
                            &output_session_id,
                            format!("\r\n[session read error: {error}]\r\n"),
                        );
                        break;
                    }
                }
            }
        });

        Ok(TerminalSessionStarted {
            session_id,
            terminal_ready_ms: None,
            x11_forwarding_status: None,
        })
    }

    pub fn list_tmux_sessions(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: TmuxConnectionRequest,
    ) -> Result<Vec<TmuxSession>, String> {
        let output = run_tmux_command(app, secrets, &request, tmux_list_command())?;
        Ok(parse_tmux_sessions(&output))
    }

    pub fn close_tmux_session(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: CloseTmuxSessionRequest,
    ) -> Result<(), String> {
        let tmux_session_id = required_tmux_session_id(request.tmux_session_id)?;
        run_tmux_command(
            app,
            secrets,
            &request.connection,
            tmux_close_command(&tmux_session_id),
        )?;
        Ok(())
    }

    pub fn rename_tmux_session(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: RenameTmuxSessionRequest,
    ) -> Result<(), String> {
        let tmux_session_id = required_tmux_session_id(request.tmux_session_id)?;
        let new_tmux_session_id = required_tmux_session_id(request.new_tmux_session_id)?;
        run_tmux_command(
            app,
            secrets,
            &request.connection,
            tmux_rename_session_command(&tmux_session_id, &new_tmux_session_id),
        )?;
        Ok(())
    }

    pub fn set_tmux_session_mouse(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: SetTmuxSessionMouseRequest,
    ) -> Result<(), String> {
        let tmux_session_id = required_tmux_session_id(request.tmux_session_id)?;
        let mouse_value = if request.enabled { "on" } else { "off" };
        run_tmux_command(
            app,
            secrets,
            &request.connection,
            format!(
                "tmux set-option -t {} mouse {}",
                shell_single_quote(&tmux_session_id),
                mouse_value
            ),
        )?;
        Ok(())
    }

    pub fn scroll_tmux_pane(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: ScrollTmuxPaneRequest,
    ) -> Result<(), String> {
        let tmux_session_id = required_tmux_session_id(request.tmux_session_id)?;
        let lines = request.lines.clamp(-200, 200);
        if lines == 0 {
            return Ok(());
        }
        run_tmux_command(
            app,
            secrets,
            &request.connection,
            tmux_scroll_pane_command(&tmux_session_id, lines),
        )?;
        Ok(())
    }

    pub fn capture_tmux_pane(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: CaptureTmuxPaneRequest,
    ) -> Result<String, String> {
        let tmux_session_id = required_tmux_session_id(request.tmux_session_id)?;
        run_tmux_command(
            app,
            secrets,
            &request.connection,
            tmux_capture_pane_command(&tmux_session_id, ssh_buffer_lines_for(request.buffer_lines)),
        )
    }

    pub fn inspect_ssh_system_context(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: TmuxConnectionRequest,
    ) -> Result<String, String> {
        let cache_key = ssh_system_context_cache_key(&request);
        if let Some(cached) = self
            .ssh_context_cache
            .lock()
            .map_err(|_| "SSH system context cache lock is poisoned".to_string())?
            .get(&cache_key)
            .cloned()
        {
            return cached;
        }

        let result = run_ssh_command(
            app,
            secrets,
            &request,
            ssh_system_context_command(),
            Some(Duration::from_secs(3)),
        );
        self.ssh_context_cache
            .lock()
            .map_err(|_| "SSH system context cache lock is poisoned".to_string())?
            .insert(cache_key, result.clone());
        result
    }

    pub fn detect_ssh_remote_os(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: TmuxConnectionRequest,
    ) -> Result<DetectedRemoteOs, String> {
        let cache_key = ssh_system_context_cache_key(&request);
        if let Some(cached) = self
            .os_detect_cache
            .lock()
            .map_err(|_| "OS detection cache lock is poisoned".to_string())?
            .get(&cache_key)
            .cloned()
        {
            return Ok(cached);
        }

        let output = run_ssh_command(
            app,
            secrets,
            &request,
            remote_os_detect_command(),
            Some(Duration::from_secs(3)),
        )?;
        let detected = parse_detected_remote_os(&output);
        self.os_detect_cache
            .lock()
            .map_err(|_| "OS detection cache lock is poisoned".to_string())?
            .insert(cache_key, detected.clone());
        Ok(detected)
    }

    pub fn list_remote_loopback_ports(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: TmuxConnectionRequest,
        hide_common_ports: bool,
    ) -> Result<Vec<RemoteLoopbackPort>, String> {
        let output = run_ssh_command(
            app,
            secrets,
            &request,
            remote_loopback_port_command(),
            Some(Duration::from_secs(5)),
        )?;
        Ok(filter_remote_loopback_ports(
            parse_remote_loopback_ports(&output),
            hide_common_ports,
        ))
    }

    pub fn start_ssh_port_forward(
        &self,
        app: AppHandle,
        secrets: &secrets::Secrets,
        request: StartSshPortForwardRequest,
    ) -> Result<SshPortForwardStarted, String> {
        let remote_port = request.remote_port;
        if remote_port == 0 {
            return Err("remote port must be between 1 and 65535".to_string());
        }

        let terminal_request = terminal_request_for_tmux(&request.connection);
        let password = connection_password_for(secrets, &terminal_request);
        let auth_method = ssh_auth_method_for(&terminal_request, password.as_deref())?;
        if !uses_native_ssh(&terminal_request, password.as_deref(), &auth_method, false) {
            return Err(
                "SSH port forwarding currently requires a native SSH Connection without ProxyJump"
                    .to_string(),
            );
        }

        let connection = ssh::NativeSshConnectionRequest {
            host: terminal_request.host.clone(),
            user: terminal_request.user.clone(),
            port: terminal_request.port.unwrap_or(22),
            auth: native_ssh_auth_for(&terminal_request, password, &auth_method)?,
            known_hosts_path: ssh::app_known_hosts_path(&app)?,
            x11_forwarding: None,
            socks_proxy: terminal_request.ssh_socks_proxy.clone(),
        };
        let listener = StdTcpListener::bind((Ipv4Addr::LOCALHOST, 0))
            .map_err(|error| format!("failed to bind local port forward listener: {error}"))?;
        listener
            .set_nonblocking(true)
            .map_err(|error| format!("failed to configure local port forward listener: {error}"))?;
        let local_port = listener
            .local_addr()
            .map_err(|error| format!("failed to read local port forward address: {error}"))?
            .port();
        let forward_id = make_session_id(&format!(
            "ssh-forward-{}-{}",
            terminal_request.host, remote_port
        ));
        let (stop_tx, stop_rx) = oneshot::channel();
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(1);
        let worker_forward_id = forward_id.clone();
        let worker = thread::spawn(move || {
            let result =
                run_ssh_port_forward_thread(listener, connection, remote_port, stop_rx, ready_tx);
            if let Err(error) = result {
                eprintln!("SSH port forward {worker_forward_id} stopped: {error}");
            }
        });

        match ready_rx.recv_timeout(Duration::from_secs(15)) {
            Ok(Ok(())) => {
                self.ssh_port_forwards
                    .lock()
                    .map_err(|_| "SSH port forward lock is poisoned".to_string())?
                    .insert(
                        forward_id.clone(),
                        SshPortForwardSession {
                            stop: Some(stop_tx),
                            worker: Some(worker),
                        },
                    );
                Ok(SshPortForwardStarted {
                    forward_id,
                    local_port,
                    remote_port,
                    url: format!("http://127.0.0.1:{local_port}"),
                })
            }
            Ok(Err(error)) => {
                let _ = worker.join();
                Err(error)
            }
            Err(_) => {
                let _ = stop_tx.send(());
                let _ = worker.join();
                Err("timed out while starting SSH port forward".to_string())
            }
        }
    }

    pub fn close_ssh_port_forward(
        &self,
        request: CloseSshPortForwardRequest,
    ) -> Result<(), String> {
        self.ssh_port_forwards
            .lock()
            .map_err(|_| "SSH port forward lock is poisoned".to_string())?
            .remove(&request.forward_id);
        Ok(())
    }

    pub fn write_terminal_input(&self, request: TerminalInputRequest) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "terminal session lock is poisoned".to_string())?;
        let session = sessions
            .get_mut(&request.session_id)
            .ok_or_else(|| "terminal session was not found".to_string())?;
        match &mut session.transport {
            TerminalTransport::Pty { writer, .. } => {
                writer
                    .write_all(&request.data)
                    .map_err(|error| format!("failed to write terminal input: {error}"))?;
                writer
                    .flush()
                    .map_err(|error| format!("failed to flush terminal input: {error}"))
            }
            TerminalTransport::NativeSsh(session) => session.write_input(request.data),
            TerminalTransport::NativeTelnet(session) => session.write_input(request.data),
            TerminalTransport::NativeSerial(session) => session.write_input(request.data),
        }
    }

    pub fn resize_terminal(&self, request: ResizeTerminalRequest) -> Result<(), String> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| "terminal session lock is poisoned".to_string())?;
        let session = sessions
            .get(&request.session_id)
            .ok_or_else(|| "terminal session was not found".to_string())?;
        match &session.transport {
            TerminalTransport::Pty { master, .. } => master
                .resize(resize_pty_size(&request))
                .map_err(|error| format!("failed to resize terminal: {error}")),
            TerminalTransport::NativeSsh(session) => session.resize(
                request.cols,
                request.rows,
                request.pixel_width.unwrap_or(0),
                request.pixel_height.unwrap_or(0),
            ),
            TerminalTransport::NativeTelnet(_) | TerminalTransport::NativeSerial(_) => Ok(()),
        }
    }

    pub fn close_terminal_session(&self, session_id: String) -> Result<(), String> {
        let session = self
            .sessions
            .lock()
            .map_err(|_| "terminal session lock is poisoned".to_string())?
            .remove(&session_id);
        if let Some(mut session) = session {
            let _ = self.stop_terminal_recording(session_id.clone());
            match session.transport {
                TerminalTransport::Pty { ref mut child, .. } => {
                    let _ = child.kill();
                }
                TerminalTransport::NativeSsh(session) => session.close(),
                TerminalTransport::NativeTelnet(session) => session.close(),
                TerminalTransport::NativeSerial(session) => session.close(),
            }
        }
        Ok(())
    }
}

pub fn launch_elevated_terminal(request: LaunchElevatedTerminalRequest) -> Result<(), String> {
    launch_elevated_terminal_impl(normalize_elevated_shell(&request.shell)?)
}

pub fn is_app_elevated() -> bool {
    is_app_elevated_impl()
}

#[cfg(target_os = "windows")]
fn is_app_elevated_impl() -> bool {
    use windows_sys::Win32::UI::Shell::IsUserAnAdmin;

    unsafe { IsUserAnAdmin() != 0 }
}

#[cfg(not(target_os = "windows"))]
fn is_app_elevated_impl() -> bool {
    false
}

fn normalize_elevated_shell(shell: &str) -> Result<&'static str, String> {
    match shell.trim().to_lowercase().as_str() {
        "cmd.exe" => Ok("cmd.exe"),
        "powershell.exe" => Ok("powershell.exe"),
        "pwsh.exe" => Ok("pwsh.exe"),
        _ => Err(
            "elevated terminal shell must be Command Prompt, PowerShell, or PowerShell 7"
                .to_string(),
        ),
    }
}

#[cfg(target_os = "windows")]
fn launch_elevated_terminal_impl(shell: &str) -> Result<(), String> {
    use std::ptr::{null, null_mut};
    use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};

    let operation = wide_string("runas");
    let file = wide_string(shell);
    let result = unsafe {
        ShellExecuteW(
            null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            null(),
            null(),
            SW_SHOWNORMAL,
        )
    } as isize;

    if result <= 32 {
        return Err(format!("failed to launch elevated {shell}"));
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn launch_elevated_terminal_impl(_shell: &str) -> Result<(), String> {
    Err("elevated local terminals are only available on Windows".to_string())
}

#[cfg(target_os = "windows")]
fn wide_string(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn pty_size_for(request: &StartTerminalSessionRequest) -> PtySize {
    PtySize {
        rows: request.rows.unwrap_or(24),
        cols: request.cols.unwrap_or(80),
        pixel_width: request.pixel_width.unwrap_or(0),
        pixel_height: request.pixel_height.unwrap_or(0),
    }
}

fn resize_pty_size(request: &ResizeTerminalRequest) -> PtySize {
    PtySize {
        rows: request.rows,
        cols: request.cols,
        pixel_width: request.pixel_width.unwrap_or(0),
        pixel_height: request.pixel_height.unwrap_or(0),
    }
}

fn uses_native_ssh(
    request: &StartTerminalSessionRequest,
    password: Option<&str>,
    auth_method: &SshAuthMethod,
    allow_interactive_password: bool,
) -> bool {
    // A SOCKS proxy no longer forces the system-ssh path: the native russh
    // transport dials through the proxy itself (see `ssh::connect_verified_client`).
    // ProxyJump still requires the system `ssh` client.
    request.connection_type.trim().eq_ignore_ascii_case("ssh")
        && ssh::can_start_native_terminal(
            match auth_method {
                SshAuthMethod::KeyFile => request.key_path.as_deref(),
                SshAuthMethod::Password | SshAuthMethod::Agent => None,
            },
            password,
            matches!(auth_method, SshAuthMethod::Agent),
            allow_interactive_password && matches!(auth_method, SshAuthMethod::Password),
            request.proxy_jump.as_deref(),
        )
}

/// The system `ssh` fallback (used for ProxyJump and keyboard-interactive
/// auth) cannot tunnel through a SOCKS proxy without an external `nc`/netcat
/// helper, which is not available on every platform. SOCKS is therefore handled
/// exclusively by the native russh transport; reaching this path with a SOCKS
/// proxy configured means it was combined with something the native transport
/// cannot do (e.g. ProxyJump), so we fail loudly instead of silently bypassing
/// the proxy.
fn reject_socks_proxy_on_system_ssh(ssh_socks_proxy: Option<&str>) -> Result<(), String> {
    if ssh_socks_proxy
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
    {
        return Err(
            "SOCKS proxy is handled by the native SSH transport and cannot be combined with \
             ProxyJump or the system ssh fallback"
                .to_string(),
        );
    }
    Ok(())
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum SshAuthMethod {
    KeyFile,
    Password,
    Agent,
}

fn ssh_auth_method_for(
    request: &StartTerminalSessionRequest,
    password: Option<&str>,
) -> Result<SshAuthMethod, String> {
    match request
        .auth_method
        .as_deref()
        .map(str::trim)
        .filter(|method| !method.is_empty())
    {
        Some("keyFile") | Some("key-file") | Some("key") => Ok(SshAuthMethod::KeyFile),
        Some("password") => Ok(SshAuthMethod::Password),
        Some("agent") | Some("sshAgent") | Some("ssh-agent") => Ok(SshAuthMethod::Agent),
        Some(_) => Err("SSH auth method must be keyFile, password, or agent".to_string()),
        None if request
            .key_path
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty()) =>
        {
            Ok(SshAuthMethod::KeyFile)
        }
        None if password.is_some() => Ok(SshAuthMethod::Password),
        None => Ok(SshAuthMethod::Agent),
    }
}

fn native_ssh_auth_for(
    request: &StartTerminalSessionRequest,
    password: Option<String>,
    auth_method: &SshAuthMethod,
) -> Result<ssh::NativeSshAuth, String> {
    match auth_method {
        SshAuthMethod::KeyFile => Ok(ssh::NativeSshAuth::KeyFile {
            key_path: request.key_path.clone().unwrap_or_default(),
        }),
        SshAuthMethod::Password => Ok(ssh::NativeSshAuth::Password { password }),
        SshAuthMethod::Agent => Ok(ssh::NativeSshAuth::Agent),
    }
}

fn should_fallback_to_interactive_ssh(error: &str) -> bool {
    let normalized = error.to_lowercase();
    normalized.contains("authentication")
        && !normalized.contains("host key")
        && !normalized.contains("known host")
}

fn connection_password_for(
    secrets: &secrets::Secrets,
    request: &StartTerminalSessionRequest,
) -> Option<String> {
    if request
        .connection_type
        .trim()
        .eq_ignore_ascii_case("telnet")
    {
        return request.secret_owner_id.as_ref().and_then(|owner_id| {
            secrets
                .read_connection_password(owner_id.clone())
                .ok()
                .flatten()
        });
    }

    if !request.connection_type.trim().eq_ignore_ascii_case("ssh") {
        return None;
    }
    if !matches!(
        ssh_auth_method_for(request, None),
        Ok(SshAuthMethod::Password)
    ) {
        return None;
    }
    if request
        .proxy_jump
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
    {
        return None;
    }
    if request
        .key_path
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
    {
        return None;
    }

    request.secret_owner_id.as_ref().and_then(|owner_id| {
        secrets
            .read_connection_password(owner_id.clone())
            .ok()
            .flatten()
    })
}

fn run_tmux_command(
    app: AppHandle,
    secrets: &secrets::Secrets,
    request: &TmuxConnectionRequest,
    command: String,
) -> Result<String, String> {
    run_ssh_command(app, secrets, request, command, None)
}

fn run_ssh_command(
    app: AppHandle,
    secrets: &secrets::Secrets,
    request: &TmuxConnectionRequest,
    command: String,
    timeout: Option<Duration>,
) -> Result<String, String> {
    let terminal_request = terminal_request_for_tmux(request);
    let password = connection_password_for(secrets, &terminal_request);
    let auth_method = ssh_auth_method_for(&terminal_request, password.as_deref())?;
    if uses_native_ssh(&terminal_request, password.as_deref(), &auth_method, false) {
        return ssh::run_remote_command(ssh::NativeSshCommandRequest {
            host: terminal_request.host.clone(),
            user: terminal_request.user.clone(),
            port: terminal_request.port.unwrap_or(22),
            auth: native_ssh_auth_for(&terminal_request, password, &auth_method)?,
            known_hosts_path: ssh::app_known_hosts_path(&app)?,
            command,
            timeout_seconds: timeout.map(|duration| duration.as_secs().max(1)),
            socks_proxy: terminal_request.ssh_socks_proxy.clone(),
        });
    }

    run_system_ssh_command(&terminal_request, command, timeout)
}

fn run_ssh_port_forward_thread(
    listener: StdTcpListener,
    connection: ssh::NativeSshConnectionRequest,
    remote_port: u16,
    stop_rx: oneshot::Receiver<()>,
    ready_tx: std::sync::mpsc::SyncSender<Result<(), String>>,
) -> Result<(), String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|error| format!("failed to create SSH port forward runtime: {error}"))?;

    runtime.block_on(run_ssh_port_forward(
        listener,
        connection,
        remote_port,
        stop_rx,
        ready_tx,
    ))
}

async fn run_ssh_port_forward(
    listener: StdTcpListener,
    connection: ssh::NativeSshConnectionRequest,
    remote_port: u16,
    mut stop_rx: oneshot::Receiver<()>,
    ready_tx: std::sync::mpsc::SyncSender<Result<(), String>>,
) -> Result<(), String> {
    let ssh_session = match tokio::time::timeout(
        Duration::from_secs(15),
        ssh::connect_verified_client(connection),
    )
    .await
    {
        Ok(Ok(session)) => session,
        Ok(Err(error)) => {
            let _ = ready_tx.send(Err(error.clone()));
            return Err(error);
        }
        Err(_) => {
            let error = "timed out while connecting SSH port forward".to_string();
            let _ = ready_tx.send(Err(error.clone()));
            return Err(error);
        }
    };
    let listener = match TcpListener::from_std(listener) {
        Ok(listener) => listener,
        Err(error) => {
            let _ = ready_tx.send(Err(format!(
                "failed to start local port forward listener: {error}"
            )));
            return Err(format!(
                "failed to start local port forward listener: {error}"
            ));
        }
    };
    let _ = ready_tx.send(Ok(()));
    let ssh_session = std::sync::Arc::new(tokio::sync::Mutex::new(ssh_session));

    loop {
        tokio::select! {
            _ = &mut stop_rx => break,
            accepted = listener.accept() => {
                let (stream, originator) = accepted
                    .map_err(|error| format!("failed to accept local port forward connection: {error}"))?;
                let ssh_session = std::sync::Arc::clone(&ssh_session);
                tokio::spawn(async move {
                    if let Err(error) = forward_local_stream(stream, originator, remote_port, ssh_session).await {
                        eprintln!("SSH port forward connection failed: {error}");
                    }
                });
            }
        }
    }

    if let Ok(session) = std::sync::Arc::try_unwrap(ssh_session) {
        let session = session.into_inner();
        let _ = ssh::disconnect_ssh_session(session, "port forward closed").await;
    }
    Ok(())
}

async fn forward_local_stream(
    mut stream: TcpStream,
    originator: SocketAddr,
    remote_port: u16,
    ssh_session: std::sync::Arc<tokio::sync::Mutex<russh::client::Handle<ssh::VerifyingClient>>>,
) -> Result<(), String> {
    let originator_ip = originator.ip().to_string();
    let originator_port = u32::from(originator.port());
    let mut channel = {
        let session = ssh_session.lock().await;
        session
            .channel_open_direct_tcpip(
                "127.0.0.1".to_string(),
                u32::from(remote_port),
                originator_ip,
                originator_port,
            )
            .await
            .map_err(|error| format!("failed to open SSH direct-tcpip channel: {error}"))?
    };

    let mut stream_closed = false;
    let mut buffer = vec![0_u8; 64 * 1024];
    loop {
        tokio::select! {
            read = stream.read(&mut buffer), if !stream_closed => {
                match read {
                    Ok(0) => {
                        stream_closed = true;
                        channel
                            .eof()
                            .await
                            .map_err(|error| format!("failed to close SSH channel input: {error}"))?;
                    }
                    Ok(count) => {
                        channel
                            .data(&buffer[..count])
                            .await
                            .map_err(|error| format!("failed to write SSH channel data: {error}"))?;
                    }
                    Err(error) => return Err(format!("failed to read local forwarded connection: {error}")),
                }
            }
            message = channel.wait() => {
                match message {
                    Some(russh::ChannelMsg::Data { data }) | Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                        stream
                            .write_all(&data)
                            .await
                            .map_err(|error| format!("failed to write local forwarded connection: {error}"))?;
                    }
                    Some(russh::ChannelMsg::Eof) | Some(russh::ChannelMsg::Close) | None => {
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
    let _ = channel.close().await;
    let _ = stream.shutdown().await;
    Ok(())
}

fn remote_loopback_port_command() -> String {
    "if command -v ss >/dev/null 2>&1; then ss -H -ltn; elif command -v netstat >/dev/null 2>&1; then netstat -ltn; elif command -v lsof >/dev/null 2>&1; then lsof -nP -iTCP -sTCP:LISTEN; else printf 'KKTerm: no ss, netstat, or lsof available\\n' >&2; fi".to_string()
}

fn parse_remote_loopback_ports(output: &str) -> Vec<RemoteLoopbackPort> {
    let mut ports = BTreeMap::new();
    for line in output.lines() {
        for token in line.split_whitespace() {
            if let Some((address, port)) = parse_loopback_endpoint(token) {
                ports
                    .entry(port)
                    .or_insert(RemoteLoopbackPort { port, address });
            }
        }
    }
    ports.into_values().collect()
}

fn filter_remote_loopback_ports(
    ports: Vec<RemoteLoopbackPort>,
    hide_common_ports: bool,
) -> Vec<RemoteLoopbackPort> {
    if !hide_common_ports {
        return ports;
    }

    ports
        .into_iter()
        .filter(|entry| entry.port >= 1024 || entry.port == 80 || entry.port == 443)
        .collect()
}

fn parse_loopback_endpoint(token: &str) -> Option<(String, u16)> {
    let trimmed = token.trim_matches(|c: char| c == ',' || c == '"' || c == '\'');
    let normalized = trimmed
        .strip_prefix("TCP@")
        .or_else(|| trimmed.strip_prefix("TCP"))
        .unwrap_or(trimmed);
    let normalized = normalized
        .strip_prefix("http://")
        .or_else(|| normalized.strip_prefix("https://"))
        .unwrap_or(normalized);
    let (host, port) = split_host_port(normalized)?;
    let host = host.trim_matches(['[', ']']);
    if !is_loopback_host(host) {
        return None;
    }
    Some((host.to_string(), port))
}

fn split_host_port(value: &str) -> Option<(&str, u16)> {
    if let Some(closing) = value.find("]:") {
        let host = value.get(1..closing)?;
        let port = value.get(closing + 2..)?.parse().ok()?;
        return Some((host, port));
    }

    let (host, port) = value.rsplit_once(':')?;
    if port == "*" {
        return None;
    }
    Some((host, port.parse().ok()?))
}

fn is_loopback_host(host: &str) -> bool {
    let host = host.trim();
    host.eq_ignore_ascii_case("localhost")
        || host == "::1"
        || host
            .parse::<IpAddr>()
            .is_ok_and(|address| address.is_loopback())
}

fn terminal_request_for_tmux(request: &TmuxConnectionRequest) -> StartTerminalSessionRequest {
    StartTerminalSessionRequest {
        session_id: None,
        title: "tmux".to_string(),
        connection_type: "ssh".to_string(),
        host: request.host.clone(),
        user: request.user.clone(),
        port: request.port,
        key_path: request.key_path.clone(),
        proxy_jump: request.proxy_jump.clone(),
        ssh_socks_proxy: request.ssh_socks_proxy.clone(),
        auth_method: request.auth_method.clone(),
        secret_owner_id: request.secret_owner_id.clone(),
        shell: None,
        serial_line: None,
        serial_speed: None,
        initial_directory: None,
        cols: None,
        pixel_height: None,
        pixel_width: None,
        rows: None,
        use_tmux: None,
        tmux_session_id: None,
        ssh_buffer_lines: None,
    }
}

fn run_system_ssh_command(
    request: &StartTerminalSessionRequest,
    remote_command: String,
    timeout: Option<Duration>,
) -> Result<String, String> {
    let host = request.host.trim();
    if host.is_empty() {
        return Err("host is required for SSH sessions".to_string());
    }

    let mut command = ProcessCommand::new("ssh");
    command.arg("-T");
    command.arg("-o");
    command.arg("BatchMode=yes");
    if let Some(port) = request.port {
        command.arg("-p");
        command.arg(port.to_string());
    }
    if let Some(key_path) = request.key_path.as_ref().map(|value| value.trim()) {
        if !key_path.is_empty() {
            command.arg("-i");
            command.arg(key_path);
        }
    }
    if let Some(proxy_jump) = request.proxy_jump.as_ref().map(|value| value.trim()) {
        if !proxy_jump.is_empty() {
            command.arg("-J");
            command.arg(proxy_jump);
        }
    }
    reject_socks_proxy_on_system_ssh(request.ssh_socks_proxy.as_deref())?;

    let target = match request.user.trim() {
        "" => host.to_string(),
        user => format!("{user}@{host}"),
    };
    command.arg(target);
    command.arg(remote_command);

    let output = if let Some(timeout) = timeout {
        run_command_with_timeout(command, timeout)?
    } else {
        command
            .output()
            .map_err(|error| format!("failed to run system ssh: {error}"))?
    };
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("system ssh command failed: {stderr}"))
    }
}

fn run_command_with_timeout(
    mut command: ProcessCommand,
    timeout: Duration,
) -> Result<std::process::Output, String> {
    let mut child = command
        .spawn()
        .map_err(|error| format!("failed to run system ssh: {error}"))?;
    let deadline = Instant::now() + timeout;
    loop {
        match child
            .try_wait()
            .map_err(|error| format!("failed to wait for system ssh: {error}"))?
        {
            Some(_) => {
                return child
                    .wait_with_output()
                    .map_err(|error| format!("failed to collect system ssh output: {error}"));
            }
            None if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!(
                    "system ssh command timed out after {} seconds",
                    timeout.as_secs()
                ));
            }
            None => thread::sleep(Duration::from_millis(25)),
        }
    }
}

fn ssh_system_context_cache_key(request: &TmuxConnectionRequest) -> String {
    format!(
        "{}:{}:{}:{}",
        request.host.trim().to_ascii_lowercase(),
        request.port.unwrap_or(22),
        request
            .proxy_jump
            .as_deref()
            .map(str::trim)
            .unwrap_or_default()
            .to_ascii_lowercase(),
        request
            .ssh_socks_proxy
            .as_deref()
            .map(str::trim)
            .unwrap_or_default()
            .to_ascii_lowercase()
    )
}

fn tmux_list_command() -> String {
    "if command -v tmux >/dev/null 2>&1; then tmux list-sessions -F '#{session_name}\t#{session_attached}\t#{session_windows}\t#{session_created}\t#{session_last_attached}\t#{session_path}\t#{session_id}' 2>/dev/null || true; fi".to_string()
}

fn tmux_close_command(tmux_session_id: &str) -> String {
    format!(
        "if command -v tmux >/dev/null 2>&1; then tmux kill-session -t {}; fi",
        shell_single_quote(tmux_session_id)
    )
}

fn tmux_rename_session_command(tmux_session_id: &str, new_tmux_session_id: &str) -> String {
    format!(
        "if command -v tmux >/dev/null 2>&1; then tmux rename-session -t {} {}; fi",
        shell_single_quote(tmux_session_id),
        shell_single_quote(new_tmux_session_id)
    )
}

const DEFAULT_SSH_BUFFER_LINES: u32 = 5_000;

fn ssh_buffer_lines_for(value: Option<u32>) -> u32 {
    value
        .filter(|lines| (100..=100_000).contains(lines))
        .unwrap_or(DEFAULT_SSH_BUFFER_LINES)
}

fn tmux_scroll_pane_command(tmux_session_id: &str, lines: i32) -> String {
    let target = format!("{}:", shell_single_quote(tmux_session_id));
    let count = lines.unsigned_abs().max(1);
    if lines < 0 {
        return format!(
            "tmux copy-mode -e -t {target} \\; send-keys -X -t {target} -N {count} scroll-up"
        );
    }
    format!("tmux send-keys -X -t {target} -N {count} scroll-down 2>/dev/null || true")
}

fn tmux_capture_pane_command(tmux_session_id: &str, buffer_lines: u32) -> String {
    format!(
        "if ! command -v tmux >/dev/null 2>&1; then printf 'tmux is not available on the remote host\\n' >&2; exit 127; fi; tmux capture-pane -p -S -{} -t {}:",
        ssh_buffer_lines_for(Some(buffer_lines)),
        shell_single_quote(tmux_session_id),
    )
}

fn remote_os_detect_command() -> String {
    // Lightweight, POSIX-sh probe: the os-release ID/ID_LIKE and kernel name pick
    // a bundled distro/OS logo for the common case. A device-tree MODEL catches
    // Raspberry Pi hardware (64-bit Pi OS reports ID=debian), and a few
    // distinctive markers identify appliance distributions (Proxmox, TrueNAS,
    // pfSense) that otherwise share a generic os-release / FreeBSD kernel.
    r#"if [ -r /etc/os-release ]; then
  . /etc/os-release
  printf 'ID=%s\n' "${ID:-}"
  printf 'ID_LIKE=%s\n' "${ID_LIKE:-}"
fi
printf 'KERNEL=%s\n' "$(uname -s 2>/dev/null)"
if [ -r /proc/device-tree/model ]; then
  printf 'MODEL=%s\n' "$(tr -d '\0' < /proc/device-tree/model 2>/dev/null)"
elif [ -r /sys/firmware/devicetree/base/model ]; then
  printf 'MODEL=%s\n' "$(tr -d '\0' < /sys/firmware/devicetree/base/model 2>/dev/null)"
fi
if [ -d /etc/pve ]; then
  printf 'APP=proxmox\n'
elif [ -r /etc/version ] && grep -qi truenas /etc/version 2>/dev/null; then
  printf 'APP=truenas\n'
elif [ -x /usr/local/sbin/pfSsh.php ]; then
  printf 'APP=pfsense\n'
fi
"#
    .to_string()
}

fn parse_detected_remote_os(output: &str) -> DetectedRemoteOs {
    let mut detected = DetectedRemoteOs::default();
    for line in output.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("ID=") {
            let value = value.trim().trim_matches('"');
            if !value.is_empty() {
                detected.id = Some(value.to_ascii_lowercase());
            }
        } else if let Some(value) = line.strip_prefix("ID_LIKE=") {
            let value = value.trim().trim_matches('"');
            if !value.is_empty() {
                detected.id_like = Some(value.to_ascii_lowercase());
            }
        } else if let Some(value) = line.strip_prefix("KERNEL=") {
            let value = value.trim();
            if !value.is_empty() {
                detected.kernel = Some(value.to_string());
            }
        } else if let Some(value) = line.strip_prefix("MODEL=") {
            let value = value.trim();
            if !value.is_empty() {
                detected.model = Some(value.to_string());
            }
        } else if let Some(value) = line.strip_prefix("APP=") {
            let value = value.trim();
            if !value.is_empty() {
                detected.app = Some(value.to_ascii_lowercase());
            }
        }
    }
    detected
}

fn ssh_system_context_command() -> String {
    r#"printf 'Hostname: '; hostname 2>/dev/null || printf 'unknown'; printf '\n'
printf 'User: '; whoami 2>/dev/null || printf 'unknown'; printf '\n'
printf 'Kernel: '; uname -srmo 2>/dev/null || uname -a 2>/dev/null || printf 'unknown'; printf '\n'
if [ -r /etc/os-release ]; then
  . /etc/os-release
  printf 'OS: %s\n' "${PRETTY_NAME:-${NAME:-unknown}}"
elif command -v lsb_release >/dev/null 2>&1; then
  printf 'OS: '; lsb_release -ds 2>/dev/null
else
  printf 'OS: unknown\n'
fi
if [ -r /etc/os-release ]; then
  printf '/etc/os-release:\n'
  sed 's/^/  /' /etc/os-release 2>/dev/null
fi
printf 'Architecture: '; uname -m 2>/dev/null || printf 'unknown'; printf '\n'
printf 'CPU: '
if command -v nproc >/dev/null 2>&1; then
  printf '%s cores' "$(nproc 2>/dev/null)"
else
  grep -c '^processor' /proc/cpuinfo 2>/dev/null | tr -d '\n' || printf 'unknown'
  printf ' cores'
fi
if [ -r /proc/cpuinfo ]; then
  cpu_model=$(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2- | sed 's/^ //')
  if [ -n "$cpu_model" ]; then printf ' (%s)' "$cpu_model"; fi
fi
printf '\n'
printf 'Memory: '
if command -v free >/dev/null 2>&1; then
  free -h 2>/dev/null | awk '/^Mem:/ {print $2 " total, " $7 " available"}'
elif [ -r /proc/meminfo ]; then
  awk '/MemTotal:/ {printf "%.1f GiB total\n", $2/1024/1024}' /proc/meminfo
else
  printf 'unknown\n'
fi
printf 'Disk: '
df -h / 2>/dev/null | awk 'NR==2 {print $2 " total, " $4 " available on /"}' || printf 'unknown\n'
printf 'Shell: %s\n' "${SHELL:-unknown}"
printf 'Uptime: '
uptime -p 2>/dev/null || uptime 2>/dev/null || printf 'unknown\n'
printf 'Package managers: '
found_pm=''
for pm in apt dnf yum pacman zypper apk brew snap flatpak; do
  if command -v "$pm" >/dev/null 2>&1; then
    if [ -n "$found_pm" ]; then printf ', '; fi
    printf '%s' "$pm"
    found_pm=1
  fi
done
if [ -z "$found_pm" ]; then printf 'unknown'; fi
printf '\n'
printf 'Runtimes: '
found_runtime=''
for runtime in node npm python3 python go rustc cargo docker podman kubectl; do
  if command -v "$runtime" >/dev/null 2>&1; then
    version=$("$runtime" --version 2>/dev/null | head -n 1)
    if [ -n "$found_runtime" ]; then printf '; '; fi
    printf '%s' "${version:-$runtime}"
    found_runtime=1
  fi
done
if [ -z "$found_runtime" ]; then printf 'none detected'; fi
printf '\n'"#
        .to_string()
}

fn required_tmux_session_id(value: String) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("tmux session id is required".to_string());
    }
    if trimmed.chars().any(char::is_control) {
        return Err("tmux session id cannot contain control characters".to_string());
    }
    Ok(trimmed.to_string())
}

fn parse_tmux_sessions(output: &str) -> Vec<TmuxSession> {
    output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\t');
            let id = parts.next()?.trim().to_string();
            if id.is_empty() {
                return None;
            }
            let attached = parts
                .next()
                .and_then(|value| value.parse::<u32>().ok())
                .is_some_and(|count| count > 0);
            let windows = parts
                .next()
                .and_then(|value| value.parse::<u32>().ok())
                .unwrap_or(0);
            let created = parts.next().and_then(|value| value.parse::<u64>().ok());
            let last_attached = parts.next().and_then(|value| value.parse::<u64>().ok());
            let path = parts
                .next()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string);
            let internal_id = parts
                .next()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string);
            Some(TmuxSession {
                id,
                attached,
                windows,
                created,
                last_attached,
                path,
                internal_id,
            })
        })
        .collect()
}

fn command_for(request: &StartTerminalSessionRequest) -> Result<CommandBuilder, String> {
    match request.connection_type.trim().to_lowercase().as_str() {
        "local" => {
            let program = request
                .shell
                .as_ref()
                .map(|shell| shell.trim())
                .filter(|shell| !shell.is_empty())
                .map(str::to_string)
                .unwrap_or_else(|| {
                    if cfg!(target_os = "windows") {
                        "powershell.exe".to_string()
                    } else {
                        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
                    }
                });
            let is_cmd = is_windows_cmd_shell(&program);
            let mut command = CommandBuilder::new(resolved_local_shell_program(program));
            if is_cmd {
                command.arg("/D");
            }
            sanitize_windows_local_environment(&mut command);
            set_terminal_environment(&mut command);
            if let Some(directory) = initial_directory_for(request) {
                command.cwd(OsString::from(directory));
            }
            Ok(command)
        }
        "ssh" => {
            let host = request.host.trim();
            if host.is_empty() {
                return Err("host is required for SSH sessions".to_string());
            }

            let mut command = CommandBuilder::new("ssh");
            set_terminal_environment(&mut command);
            command.arg("-tt");
            if let Some(port) = request.port {
                command.arg("-p");
                command.arg(port.to_string());
            }
            if let Some(key_path) = request.key_path.as_ref().map(|value| value.trim()) {
                if !key_path.is_empty() {
                    command.arg("-i");
                    command.arg(key_path);
                }
            }
            if let Some(proxy_jump) = request.proxy_jump.as_ref().map(|value| value.trim()) {
                if !proxy_jump.is_empty() {
                    command.arg("-J");
                    command.arg(proxy_jump);
                }
            }
            reject_socks_proxy_on_system_ssh(request.ssh_socks_proxy.as_deref())?;

            let target = match request.user.trim() {
                "" => host.to_string(),
                user => format!("{user}@{host}"),
            };
            command.arg(target);
            if request.use_tmux.unwrap_or(false) {
                if let Some(tmux_session_id) = request
                    .tmux_session_id
                    .as_deref()
                    .map(str::trim)
                    .filter(|session_id| !session_id.is_empty())
                {
                    command.arg(ssh::remote_tmux_resume_command(
                        initial_directory_for(request).as_deref(),
                        tmux_session_id,
                        ssh_buffer_lines_for(request.ssh_buffer_lines),
                    ));
                } else if let Some(directory) = initial_directory_for(request) {
                    command.arg(remote_shell_command_for_initial_directory(&directory));
                }
            } else if let Some(directory) = initial_directory_for(request) {
                command.arg(remote_shell_command_for_initial_directory(&directory));
            }
            Ok(command)
        }
        other => Err(format!(
            "{other} sessions do not have a terminal transport yet"
        )),
    }
}

fn set_terminal_environment(command: &mut CommandBuilder) {
    command.env("TERM", "xterm-256color");
    command.env("COLORTERM", "truecolor");
}

#[cfg(target_os = "windows")]
const WINDOWS_LOCAL_ENV_ALLOWLIST: &[&str] = &[
    "ALLUSERSPROFILE",
    "APPDATA",
    "CommonProgramFiles",
    "CommonProgramFiles(x86)",
    "ComSpec",
    "HOMEDRIVE",
    "HOMEPATH",
    "LOCALAPPDATA",
    "NUMBER_OF_PROCESSORS",
    "OS",
    "PATH",
    "PATHEXT",
    "POSH_THEMES_PATH",
    "PROCESSOR_ARCHITECTURE",
    "PROCESSOR_IDENTIFIER",
    "PROCESSOR_LEVEL",
    "PROCESSOR_REVISION",
    "ProgramData",
    "ProgramFiles",
    "ProgramFiles(x86)",
    "PSModulePath",
    "PUBLIC",
    "SystemDrive",
    "SystemRoot",
    "TEMP",
    "TMP",
    "USERDOMAIN",
    "USERNAME",
    "USERPROFILE",
    "windir",
];

fn sanitize_windows_local_environment(command: &mut CommandBuilder) -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        command.env_clear();
        let mut retained = Vec::new();
        for key in WINDOWS_LOCAL_ENV_ALLOWLIST {
            if let Some(value) = std::env::var_os(key) {
                command.env(*key, value);
                retained.push((*key).to_string());
            }
        }
        return retained;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = command;
        Vec::new()
    }
}

fn resolved_local_shell_program(program: String) -> String {
    if is_windows_cmd_shell(&program) {
        windows_cmd_program()
    } else {
        program
    }
}

fn is_windows_cmd_shell(program: &str) -> bool {
    let trimmed = program.trim();
    if trimmed.is_empty() {
        return false;
    }

    let normalized = trimmed.replace('/', "\\").to_ascii_lowercase();
    normalized == "cmd" || normalized == "cmd.exe" || normalized.ends_with("\\cmd.exe")
}

fn windows_cmd_program() -> String {
    std::env::var("ComSpec")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "cmd.exe".to_string())
}

/// Whether the given local shell program can be launched. Mirrors how
/// `command_for` would resolve the program: `cmd` maps to `ComSpec`, and a
/// bare program name (no path separator) is searched across `PATH` using
/// `PATHEXT`. An absolute or relative path is checked directly. The pwsh
/// pre-flight gate is Windows-only; on other platforms this always returns
/// true so callers spawn `$SHELL` unchanged.
pub fn local_shell_available(shell: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        let resolved = resolved_local_shell_program(shell.trim().to_string());
        if resolved.is_empty() {
            return false;
        }
        let path = std::path::Path::new(&resolved);
        if resolved.contains('\\') || resolved.contains('/') || path.is_absolute() {
            return path.is_file();
        }
        let pathext =
            std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_string());
        let exts: Vec<String> = pathext
            .split(';')
            .map(str::trim)
            .filter(|ext| !ext.is_empty())
            .map(str::to_string)
            .collect();
        let path_var = match std::env::var_os("PATH") {
            Some(value) => value,
            None => return false,
        };
        for dir in std::env::split_paths(&path_var) {
            // Direct match (the program already carries an extension, e.g. "pwsh.exe").
            if dir.join(&resolved).is_file() {
                return true;
            }
            // Extension-completed match (e.g. "pwsh" + ".EXE").
            for ext in &exts {
                if dir.join(format!("{resolved}{ext}")).is_file() {
                    return true;
                }
            }
        }
        false
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = shell;
        true
    }
}

fn initial_directory_for(request: &StartTerminalSessionRequest) -> Option<String> {
    request
        .initial_directory
        .as_deref()
        .map(str::trim)
        .filter(|directory| !directory.is_empty() && *directory != "~")
        .map(str::to_string)
}

fn remote_shell_command_for_initial_directory(directory: &str) -> String {
    format!(
        "cd -- {} && exec \"${{SHELL:-sh}}\" -i",
        shell_single_quote(directory)
    )
}

fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn make_session_id(title: &str) -> String {
    let slug = title
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    format!(
        "{}-{unique}",
        if slug.is_empty() { "session" } else { &slug }
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn allowlist_includes_posh_themes_path() {
        assert!(
            WINDOWS_LOCAL_ENV_ALLOWLIST.contains(&"POSH_THEMES_PATH"),
            "oh-my-posh theme loading needs POSH_THEMES_PATH passed through"
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn local_shell_available_resolves_known_and_unknown_programs() {
        // cmd.exe resolves via ComSpec on every Windows host.
        assert!(local_shell_available("cmd.exe"));
        // powershell.exe (5.1) ships in System32 and is on PATH everywhere.
        assert!(local_shell_available("powershell.exe"));
        // A bogus program name must not resolve.
        assert!(!local_shell_available("kkterm-no-such-shell.exe"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn local_shell_available_is_permissive_off_windows() {
        // The pwsh pre-flight gate is Windows-only; elsewhere this is a no-op.
        assert!(local_shell_available("anything"));
    }

    #[test]
    fn parse_detected_remote_os_reads_os_release_and_kernel() {
        let detected = parse_detected_remote_os("ID=ubuntu\nID_LIKE=debian\nKERNEL=Linux\n");
        assert_eq!(detected.id.as_deref(), Some("ubuntu"));
        assert_eq!(detected.id_like.as_deref(), Some("debian"));
        assert_eq!(detected.kernel.as_deref(), Some("Linux"));
    }

    #[test]
    fn parse_detected_remote_os_lowercases_ids_and_strips_quotes() {
        let detected = parse_detected_remote_os("ID=\"RHEL\"\nID_LIKE=\"fedora\"\nKERNEL=Linux\n");
        assert_eq!(detected.id.as_deref(), Some("rhel"));
        assert_eq!(detected.id_like.as_deref(), Some("fedora"));
    }

    #[test]
    fn parse_detected_remote_os_handles_kernel_only_output() {
        let detected = parse_detected_remote_os("KERNEL=Darwin\n");
        assert_eq!(detected.id, None);
        assert_eq!(detected.id_like, None);
        assert_eq!(detected.kernel.as_deref(), Some("Darwin"));
    }

    #[test]
    fn parse_detected_remote_os_reads_model_and_app_markers() {
        let detected = parse_detected_remote_os(
            "ID=debian\nKERNEL=Linux\nMODEL=Raspberry Pi 5 Model B Rev 1.0\n",
        );
        assert_eq!(detected.model.as_deref(), Some("Raspberry Pi 5 Model B Rev 1.0"));
        let appliance = parse_detected_remote_os("ID=debian\nKERNEL=Linux\nAPP=Proxmox\n");
        assert_eq!(appliance.app.as_deref(), Some("proxmox"));
    }

    fn local_request() -> StartTerminalSessionRequest {
        StartTerminalSessionRequest {
            session_id: None,
            title: "Local shell".to_string(),
            connection_type: "local".to_string(),
            host: "localhost".to_string(),
            user: String::new(),
            port: None,
            key_path: None,
            proxy_jump: None,
            ssh_socks_proxy: None,
            auth_method: None,
            secret_owner_id: None,
            shell: None,
            serial_line: None,
            serial_speed: None,
            initial_directory: None,
            cols: None,
            pixel_height: None,
            pixel_width: None,
            rows: None,
            use_tmux: None,
            tmux_session_id: None,
            ssh_buffer_lines: None,
        }
    }

    #[test]
    fn ssh_auth_method_prefers_explicit_agent_and_key_file() {
        let mut request = ssh_request();

        request.auth_method = Some("agent".to_string());
        assert!(matches!(
            ssh_auth_method_for(&request, None),
            Ok(SshAuthMethod::Agent)
        ));

        request.auth_method = Some("keyFile".to_string());
        request.key_path = Some("C:\\Users\\example\\.ssh\\id_ed25519".to_string());
        assert!(matches!(
            ssh_auth_method_for(&request, None),
            Ok(SshAuthMethod::KeyFile)
        ));
    }

    #[test]
    fn password_auth_requires_explicit_password_method_before_reading_keychain() {
        let mut request = ssh_request();
        request.auth_method = Some("password".to_string());
        assert!(matches!(
            ssh_auth_method_for(&request, Some("not-for-sqlite")),
            Ok(SshAuthMethod::Password)
        ));

        request.auth_method = Some("keyboardInteractive".to_string());
        assert!(ssh_auth_method_for(&request, None).is_err());
    }

    #[test]
    fn password_auth_without_stored_secret_uses_native_interactive_auth_even_with_key_path() {
        let mut request = ssh_request();
        request.auth_method = Some("password".to_string());
        request.key_path = Some("C:\\Users\\example\\.ssh\\id_ed25519".to_string());
        let auth_method = ssh_auth_method_for(&request, None).expect("auth method resolves");

        assert!(uses_native_ssh(&request, None, &auth_method, true));
        assert!(!uses_native_ssh(&request, None, &auth_method, false));
    }

    #[test]
    fn password_auth_ignores_stale_key_path_for_native_eligibility() {
        let mut request = ssh_request();
        request.auth_method = Some("password".to_string());
        request.key_path = Some("C:\\Users\\example\\.ssh\\id_ed25519".to_string());
        request.proxy_jump = Some("bastion".to_string());
        let auth_method = ssh_auth_method_for(&request, None).expect("auth method resolves");

        assert!(
            !uses_native_ssh(&request, None, &auth_method, true),
            "ProxyJump, not a stale key path, should be what disqualifies native SSH here"
        );
    }

    #[test]
    fn native_auth_errors_fallback_to_interactive_ssh() {
        assert!(should_fallback_to_interactive_ssh(
            "SSH agent authentication was unavailable: Pageant agent failed to list SSH agent identities: early eof"
        ));
        assert!(should_fallback_to_interactive_ssh(
            "SSH key-file authentication failed: invalid key"
        ));
        assert!(should_fallback_to_interactive_ssh(
            "SSH password authentication failed: rejected"
        ));
        assert!(!should_fallback_to_interactive_ssh(
            "SSH host key for example.internal:22 changed"
        ));
        assert!(!should_fallback_to_interactive_ssh(
            "failed to open SSH channel"
        ));
    }

    fn ssh_request() -> StartTerminalSessionRequest {
        StartTerminalSessionRequest {
            session_id: None,
            title: "Test SSH".to_string(),
            connection_type: "ssh".to_string(),
            host: "example.internal".to_string(),
            user: "admin".to_string(),
            port: Some(22),
            key_path: None,
            proxy_jump: None,
            ssh_socks_proxy: None,
            auth_method: None,
            secret_owner_id: None,
            shell: None,
            serial_line: None,
            serial_speed: None,
            initial_directory: None,
            cols: None,
            pixel_height: None,
            pixel_width: None,
            rows: None,
            use_tmux: None,
            tmux_session_id: None,
            ssh_buffer_lines: None,
        }
    }

    #[test]
    fn remote_initial_directory_command_quotes_shell_path() {
        assert_eq!(
            remote_shell_command_for_initial_directory("/srv/releases"),
            "cd -- '/srv/releases' && exec \"${SHELL:-sh}\" -i"
        );
        assert_eq!(
            remote_shell_command_for_initial_directory("/srv/app's current"),
            "cd -- '/srv/app'\\''s current' && exec \"${SHELL:-sh}\" -i"
        );
    }

    #[test]
    fn terminal_commands_advertise_xterm_truecolor_capabilities() {
        let mut command = CommandBuilder::new("shell");
        set_terminal_environment(&mut command);

        assert_eq!(
            command.get_env("TERM").and_then(|value| value.to_str()),
            Some("xterm-256color")
        );
        assert_eq!(
            command
                .get_env("COLORTERM")
                .and_then(|value| value.to_str()),
            Some("truecolor")
        );
    }

    #[test]
    fn recognizes_cmd_shell_names_and_paths() {
        assert!(is_windows_cmd_shell("cmd"));
        assert!(is_windows_cmd_shell("cmd.exe"));
        assert!(is_windows_cmd_shell("C:/Windows/System32/cmd.exe"));
        assert!(is_windows_cmd_shell("C:\\Windows\\System32\\cmd.exe"));
        assert!(!is_windows_cmd_shell("powershell.exe"));
    }

    #[test]
    fn local_cmd_sessions_disable_command_processor_autorun() {
        let mut request = local_request();
        request.shell = Some("cmd.exe".to_string());

        let command = command_for(&request).expect("local cmd command should build");
        let argv = command
            .get_argv()
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect::<Vec<_>>();

        assert_eq!(argv, vec![windows_cmd_program(), "/D".to_string()]);
    }

    #[test]
    fn terminal_pty_size_preserves_pixel_dimensions() {
        let mut request = ssh_request();
        request.cols = Some(132);
        request.rows = Some(43);
        request.pixel_width = Some(1200);
        request.pixel_height = Some(720);

        let size = pty_size_for(&request);

        assert_eq!(size.cols, 132);
        assert_eq!(size.rows, 43);
        assert_eq!(size.pixel_width, 1200);
        assert_eq!(size.pixel_height, 720);
    }

    #[test]
    fn tmux_capture_pane_command_targets_session_history() {
        assert_eq!(
            tmux_capture_pane_command("kkterm-test", 5_000),
            "if ! command -v tmux >/dev/null 2>&1; then printf 'tmux is not available on the remote host\\n' >&2; exit 127; fi; tmux capture-pane -p -S -5000 -t 'kkterm-test':"
        );
    }

    #[test]
    fn tmux_scroll_pane_command_enters_copy_mode_for_wheel_up() {
        assert_eq!(
            tmux_scroll_pane_command("kkterm-test", -4),
            "tmux copy-mode -e -t 'kkterm-test': \\; send-keys -X -t 'kkterm-test': -N 4 scroll-up"
        );
    }

    #[test]
    fn tmux_scroll_pane_command_scrolls_down_only_in_copy_mode() {
        assert_eq!(
            tmux_scroll_pane_command("kkterm-test", 3),
            "tmux send-keys -X -t 'kkterm-test': -N 3 scroll-down 2>/dev/null || true"
        );
    }

    #[test]
    fn tmux_scroll_pane_command_quotes_session_id() {
        assert_eq!(
            tmux_scroll_pane_command("kkterm-test'quoted", -1),
            "tmux copy-mode -e -t 'kkterm-test'\\''quoted': \\; send-keys -X -t 'kkterm-test'\\''quoted': -N 1 scroll-up"
        );
    }

    #[test]
    fn tmux_capture_pane_command_quotes_session_id() {
        assert_eq!(
            tmux_capture_pane_command("kkterm-test'quoted", 5_000),
            "if ! command -v tmux >/dev/null 2>&1; then printf 'tmux is not available on the remote host\\n' >&2; exit 127; fi; tmux capture-pane -p -S -5000 -t 'kkterm-test'\\''quoted':"
        );
    }

    #[test]
    fn tmux_capture_pane_command_uses_requested_history_limit() {
        assert_eq!(
            tmux_capture_pane_command("kkterm-test", 12_000),
            "if ! command -v tmux >/dev/null 2>&1; then printf 'tmux is not available on the remote host\\n' >&2; exit 127; fi; tmux capture-pane -p -S -12000 -t 'kkterm-test':"
        );
    }

    #[test]
    fn recording_folder_name_keeps_connection_name_and_id_fragment() {
        assert_eq!(
            recording_folder_name("conn-1234567890abcdef", "Prod / East: SSH"),
            "prod-east-ssh--conn-12345678"
        );
        assert_eq!(
            recording_folder_name("quick-connection", "   "),
            "connection--quick-co"
        );
    }

    #[test]
    fn terminal_recording_writes_initial_buffer_then_live_output() {
        let root = temp_recording_root("initial-buffer");
        let manager = TerminalRecordingManager::new_for_root(root.clone());
        let started = manager
            .start_recording(StartTerminalRecordingRequest {
                session_id: "session-123".to_string(),
                connection_id: "conn-1234567890abcdef".to_string(),
                connection_name: "Prod East".to_string(),
                initial_buffer: "existing line\n".to_string(),
            })
            .expect("recording starts");

        manager
            .record_output("session-123", "new line\r\n")
            .expect("live output records");
        let stopped = manager
            .stop_recording("session-123".to_string())
            .expect("recording stops")
            .expect("recording existed");

        assert_eq!(started.path, stopped.path);
        let text = std::fs::read_to_string(&stopped.path).expect("recording file reads");
        assert_eq!(text, "existing line\nnew line\r\n");
        assert!(
            stopped
                .path
                .starts_with(root.join("prod-east").join("prod-east--conn-12345678"))
        );
    }

    #[test]
    fn tmux_rename_session_command_quotes_old_and_new_session_ids() {
        assert_eq!(
            tmux_rename_session_command("kkterm-test'old", "kkterm-test'new"),
            "if command -v tmux >/dev/null 2>&1; then tmux rename-session -t 'kkterm-test'\\''old' 'kkterm-test'\\''new'; fi"
        );
    }

    #[test]
    fn parses_loopback_ports_from_ss_output() {
        let output = "\
LISTEN 0 4096 127.0.0.1:3000 0.0.0.0:*
LISTEN 0 4096 0.0.0.0:8080 0.0.0.0:*
LISTEN 0 4096 [::1]:9090 [::]:*
";

        let ports = parse_remote_loopback_ports(output);

        assert_eq!(ports.len(), 2);
        assert_eq!(ports[0].port, 3000);
        assert_eq!(ports[1].port, 9090);
    }

    #[test]
    fn parses_loopback_ports_from_lsof_output() {
        let output = "\
COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
node 123 user 21u IPv4 0x0 0t0 TCP 127.0.0.1:5173 (LISTEN)
python 124 user 22u IPv4 0x0 0t0 TCP TCP@localhost:8000 (LISTEN)
";

        let ports = parse_remote_loopback_ports(output);

        assert_eq!(ports.len(), 2);
        assert_eq!(ports[0].port, 5173);
        assert_eq!(ports[1].port, 8000);
    }

    #[test]
    fn filters_common_loopback_ports_except_web_ports() {
        let ports = vec![
            RemoteLoopbackPort {
                port: 22,
                address: "127.0.0.1".to_string(),
            },
            RemoteLoopbackPort {
                port: 53,
                address: "127.0.0.1".to_string(),
            },
            RemoteLoopbackPort {
                port: 80,
                address: "127.0.0.1".to_string(),
            },
            RemoteLoopbackPort {
                port: 443,
                address: "127.0.0.1".to_string(),
            },
            RemoteLoopbackPort {
                port: 1023,
                address: "127.0.0.1".to_string(),
            },
            RemoteLoopbackPort {
                port: 3000,
                address: "127.0.0.1".to_string(),
            },
        ];

        let filtered = filter_remote_loopback_ports(ports, true);

        assert_eq!(
            filtered.iter().map(|entry| entry.port).collect::<Vec<_>>(),
            vec![80, 443, 3000]
        );
    }

    fn temp_recording_root(name: &str) -> PathBuf {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system clock is after Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "kkterm-recordings-{name}-{}-{unique}",
            std::process::id()
        ))
    }
}
