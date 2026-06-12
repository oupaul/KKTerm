#[allow(unused_imports)]
use super::*;
use super::ai_interaction_debug;

pub(crate) struct AcpCommandSpec {
    pub(crate) program: String,
    pub(crate) args: Vec<String>,
    pub(crate) label: &'static str,
}

pub(crate) struct AcpStdioSession {
    child: std::process::Child,
    stdin: std::process::ChildStdin,
    rx: mpsc::Receiver<String>,
    /// Polled between received lines (≤250ms latency). When it reports true
    /// the in-flight request aborts and `Drop` kills the CLI child process.
    /// Set only for interactive streaming runs so Stop cancels Codex/Claude
    /// CLI sessions the same way it cancels HTTP provider runs.
    cancel_probe: Option<Box<dyn Fn() -> bool>>,
}

impl AcpStdioSession {
    fn start(spec: &AcpCommandSpec) -> Result<Self, String> {
        let mut child = Command::new(&spec.program);
        child
            .args(&spec.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        crate::installer::proc::no_window(&mut child);
        let mut child = child.spawn().map_err(|error| {
            format!(
                "failed to start {} ACP backend with `{}`: {error}",
                spec.label, spec.program
            )
        })?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| format!("failed to open {} ACP stdin", spec.label))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| format!("failed to open {} ACP stdout", spec.label))?;
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    ai_interaction_debug!("agent.acp_stderr", json!({ "line": line }));
                }
            });
        }
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                let _ = tx.send(line);
            }
        });
        Ok(Self {
            child,
            stdin,
            rx,
            cancel_probe: None,
        })
    }

    fn request(
        &mut self,
        id: u64,
        method: &str,
        params: Value,
        timeout_duration: Duration,
        mut notification_handler: impl FnMut(&mut Self, Value) -> Result<(), String>,
    ) -> Result<Value, String> {
        self.write_json(json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        }))?;
        self.wait_for_id(id, timeout_duration, &mut notification_handler)
    }

    fn wait_for_id(
        &mut self,
        id: u64,
        timeout_duration: Duration,
        notification_handler: &mut impl FnMut(&mut Self, Value) -> Result<(), String>,
    ) -> Result<Value, String> {
        let deadline = Instant::now() + timeout_duration;
        while Instant::now() < deadline {
            if self.cancel_probe.as_ref().is_some_and(|probe| probe()) {
                return Err(ASSISTANT_STREAM_CANCELED_ERROR.to_string());
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            let Ok(line) = self
                .rx
                .recv_timeout(remaining.min(Duration::from_millis(250)))
            else {
                continue;
            };
            let value = serde_json::from_str::<Value>(&line)
                .map_err(|error| format!("ACP backend returned invalid JSON-RPC: {error}"))?;
            ai_interaction_debug!("agent.acp_recv", value.clone());
            if value.get("id").and_then(Value::as_u64) == Some(id) {
                if let Some(error) = value.get("error") {
                    return Err(format!("ACP backend returned an error: {error}"));
                }
                return value
                    .get("result")
                    .cloned()
                    .ok_or_else(|| "ACP backend response did not include result".to_string());
            }
            if value.get("method").is_some() {
                notification_handler(self, value)?;
            }
        }
        Err(format!("timed out waiting for ACP response id {id}"))
    }

    fn write_json(&mut self, value: Value) -> Result<(), String> {
        ai_interaction_debug!("agent.acp_send", value.clone());
        let line = serde_json::to_string(&value)
            .map_err(|error| format!("failed to serialize ACP JSON-RPC: {error}"))?;
        writeln!(self.stdin, "{line}")
            .and_then(|_| self.stdin.flush())
            .map_err(|error| format!("failed to write ACP JSON-RPC: {error}"))
    }
}

impl Drop for AcpStdioSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

pub(crate) fn run_acp_agent_command(
    backend: AiCliBackendKind,
    model: &str,
    prompt: &str,
    app: &tauri::AppHandle,
    settings: &AiProviderSettings,
) -> Result<String, String> {
    run_acp_agent_command_streaming(backend, model, prompt, None, app, settings)
}

pub(crate) fn run_acp_agent_command_streaming(
    backend: AiCliBackendKind,
    model: &str,
    prompt: &str,
    channel: Option<&Channel<Value>>,
    app: &tauri::AppHandle,
    settings: &AiProviderSettings,
) -> Result<String, String> {
    let spec = acp_command_spec(backend);
    let cwd = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve ACP working directory: {error}"))?;
    fs::create_dir_all(&cwd)
        .map_err(|error| format!("failed to create ACP working directory: {error}"))?;
    let cwd = cwd
        .to_str()
        .ok_or_else(|| "ACP working directory is not valid UTF-8".to_string())?
        .to_string();
    let mut session = AcpStdioSession::start(&spec)?;
    if channel.is_some() {
        // Interactive run: let the user's Stop button cancel the CLI session.
        let probe_app = app.clone();
        let generation = assistant_stream_generation(app);
        session.cancel_probe = Some(Box::new(move || {
            assistant_stream_canceled(&probe_app, generation)
        }));
    }
    let mut content = String::new();
    session.request(
        1,
        "initialize",
        json!({
            "protocolVersion": 1,
            "clientCapabilities": {},
            "clientInfo": {
                "name": "kkterm",
                "title": "KKTerm",
                "version": env!("CARGO_PKG_VERSION")
            }
        }),
        Duration::from_secs(30),
        |session, message| {
            handle_acp_backend_message(session, message, &mut content, channel, app, settings)
        },
    )?;
    let new_session = session.request(
        2,
        "session/new",
        json!({
            "cwd": cwd,
            "mcpServers": [acp_kkterm_mcp_server(&kkterm_cli_command_path()?)]
        }),
        Duration::from_secs(60),
        |session, message| {
            handle_acp_backend_message(session, message, &mut content, channel, app, settings)
        },
    )?;
    let session_id = new_session
        .get("sessionId")
        .and_then(Value::as_str)
        .ok_or_else(|| "ACP session/new response did not include sessionId".to_string())?
        .to_string();
    let prompt = format!("Requested model: {model}\n\n{prompt}");
    session.request(
        3,
        "session/prompt",
        json!({
            "sessionId": session_id,
            "prompt": [
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }),
        COPILOT_SDK_RESPONSE_TIMEOUT,
        |session, message| {
            handle_acp_backend_message(session, message, &mut content, channel, app, settings)
        },
    )?;
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err(format!(
            "{} ACP backend did not return assistant text",
            spec.label
        ));
    }
    Ok(trimmed.to_string())
}

pub(crate) fn handle_acp_backend_message(
    session: &mut AcpStdioSession,
    message: Value,
    content: &mut String,
    channel: Option<&Channel<Value>>,
    app: &tauri::AppHandle,
    settings: &AiProviderSettings,
) -> Result<(), String> {
    let method = message.get("method").and_then(Value::as_str).unwrap_or("");
    match method {
        "session/update" => {
            if let Some(delta) = acp_agent_message_delta_text(&message) {
                content.push_str(&delta);
                if let Some(channel) = channel {
                    emit_stream(channel, &AiStreamEvent::ContentDelta { delta })?;
                }
            }
        }
        "session/request_permission" => {
            if let Some(id) = acp_jsonrpc_id(&message) {
                let approved = acp_permission_approved(app, settings, &message);
                let outcome = acp_permission_selection(&message, approved);
                session.write_json(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "outcome": outcome
                    }
                }))?;
            }
        }
        _ => {
            if let Some(id) = message.get("id").and_then(Value::as_u64) {
                session.write_json(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": {
                        "code": -32601,
                        "message": format!("KKTerm does not expose `{method}` to ACP CLI backends yet")
                    }
                }))?;
            }
        }
    }
    Ok(())
}

pub(crate) fn acp_jsonrpc_id(message: &Value) -> Option<Value> {
    match message.get("id") {
        Some(Value::Number(_)) | Some(Value::String(_)) => message.get("id").cloned(),
        _ => None,
    }
}

pub(crate) fn kkterm_cli_command_path() -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve app executable path: {error}"))?;
    let exe_folder = exe_path
        .parent()
        .ok_or_else(|| "failed to resolve app executable folder".to_string())?;
    let cli_name = if cfg!(target_os = "windows") {
        "kkterm-cli.exe"
    } else {
        "kkterm-cli"
    };
    Ok(exe_folder.join(cli_name).to_string_lossy().into_owned())
}

pub(crate) fn acp_kkterm_mcp_server(command: &str) -> Value {
    json!({
        "type": "stdio",
        "name": "kkterm",
        "command": command,
        "args": [],
        "env": [],
    })
}

pub(crate) fn acp_permission_selection(message: &Value, approved: bool) -> Value {
    let desired_prefix = if approved { "allow" } else { "reject" };
    let selected_option = message
        .pointer("/params/options")
        .and_then(Value::as_array)
        .and_then(|options| {
            options.iter().find_map(|option| {
                let kind = option.get("kind").and_then(Value::as_str).unwrap_or("");
                let id = option.get("optionId").and_then(Value::as_str)?;
                if kind.starts_with(desired_prefix) {
                    Some(id.to_string())
                } else {
                    None
                }
            })
        });
    match selected_option {
        Some(option_id) => json!({
            "outcome": "selected",
            "optionId": option_id,
        }),
        None => json!({
            "outcome": "cancelled",
        }),
    }
}

pub(crate) fn acp_permission_approved(
    app: &tauri::AppHandle,
    settings: &AiProviderSettings,
    message: &Value,
) -> bool {
    if settings.tool_permission_mode() == "allowAll" {
        return true;
    }
    let tool_name = acp_permission_tool_name(message);
    let args = message
        .pointer("/params/toolCall")
        .cloned()
        .unwrap_or(Value::Null);
    // ACP tool calls carry CLI-defined shapes we can't classify, so no
    // riskElevated hint here; session-allow behavior is unchanged for ACP.
    match app.try_state::<AssistantToolApprovalBridge>() {
        Some(bridge) => {
            tauri::async_runtime::block_on(bridge.request(app, &tool_name, &args, false))
        }
        None => false,
    }
}

pub(crate) fn acp_permission_tool_name(message: &Value) -> String {
    message
        .pointer("/params/toolCall/title")
        .and_then(Value::as_str)
        .or_else(|| {
            message
                .pointer("/params/toolCall/name")
                .and_then(Value::as_str)
        })
        .or_else(|| {
            message
                .pointer("/params/toolCall/toolName")
                .and_then(Value::as_str)
        })
        .unwrap_or("acp_tool_call")
        .trim_start_matches("Call ")
        .to_string()
}

#[cfg(test)]
pub(crate) fn acp_permission_rejection(message: &Value) -> Value {
    acp_permission_selection(message, false)
}

pub(crate) fn acp_agent_message_delta_text(message: &Value) -> Option<String> {
    let update = message.pointer("/params/update")?;
    let kind = update.get("sessionUpdate").and_then(Value::as_str)?;
    if kind != "agent_message_chunk" {
        return None;
    }
    acp_content_text(update.get("content")?)
}

pub(crate) fn acp_content_text(content: &Value) -> Option<String> {
    if content.get("type").and_then(Value::as_str) == Some("text") {
        return content
            .get("text")
            .and_then(Value::as_str)
            .map(str::to_string);
    }
    None
}

pub(crate) fn acp_command_spec(backend: AiCliBackendKind) -> AcpCommandSpec {
    match backend {
        AiCliBackendKind::Codex => AcpCommandSpec {
            program: npx_command(),
            args: vec![
                "-y".to_string(),
                "@zed-industries/codex-acp@0.15.0".to_string(),
            ],
            label: "Codex ACP",
        },
        AiCliBackendKind::ClaudeCode => AcpCommandSpec {
            program: npx_command(),
            args: vec![
                "-y".to_string(),
                "@agentclientprotocol/claude-agent-acp@0.40.0".to_string(),
            ],
            label: "Claude ACP",
        },
    }
}

pub(crate) fn npx_command() -> String {
    if cfg!(target_os = "windows") {
        "npx.cmd".to_string()
    } else {
        "npx".to_string()
    }
}

pub async fn ai_cli_backend_status(
    provider: AiCliBackendKind,
    configured_path: Option<String>,
) -> AiCliBackendStatus {
    let command = resolve_cli_backend_command(provider, configured_path);
    let command_for_worker = command.clone();
    tauri::async_runtime::spawn_blocking(move || cli_backend_status(provider, command_for_worker))
        .await
        .unwrap_or_else(|error| AiCliBackendStatus {
            provider,
            command,
            installed: false,
            authenticated: false,
            version: None,
            error: Some(format!("failed to check CLI status: {error}")),
        })
}

pub fn open_ai_cli_backend_auth(
    provider: AiCliBackendKind,
    configured_path: Option<String>,
) -> Result<(), String> {
    let command = resolve_cli_backend_command(provider, configured_path);
    let auth_command = match provider {
        AiCliBackendKind::Codex => format!("{} login", shell_quote(&command)),
        AiCliBackendKind::ClaudeCode => format!("{} auth login", shell_quote(&command)),
    };
    spawn_external_terminal(&auth_command)
}

pub(crate) fn default_cli_command(provider: AiCliBackendKind) -> &'static str {
    match provider {
        AiCliBackendKind::Codex => "codex",
        AiCliBackendKind::ClaudeCode => "claude",
    }
}

pub(crate) fn resolve_cli_backend_command(provider: AiCliBackendKind, configured: Option<String>) -> String {
    if let Some(path) = configured
        .map(|value| normalize_configured_cli_command(&value))
        .filter(|value| !value.is_empty())
    {
        return path;
    }

    common_cli_backend_command_path(provider)
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| default_cli_command(provider).to_string())
}

pub(crate) fn normalize_configured_cli_command(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed[1..trimmed.len() - 1].trim().to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn common_cli_backend_command_path(provider: AiCliBackendKind) -> Option<PathBuf> {
    cli_backend_discovery_candidates(provider)
        .into_iter()
        .find(|path| path.is_file())
}

pub(crate) fn cli_backend_discovery_candidates(provider: AiCliBackendKind) -> Vec<PathBuf> {
    combine_cli_backend_candidates(
        path_cli_backend_candidates(provider),
        common_user_bin_candidates(cli_backend_command_names(provider)),
        match provider {
            AiCliBackendKind::Codex => codex_vscode_extension_candidates(),
            AiCliBackendKind::ClaudeCode => Vec::new(),
        },
    )
}

pub(crate) fn combine_cli_backend_candidates(
    path_candidates: Vec<PathBuf>,
    common_candidates: Vec<PathBuf>,
    extension_candidates: Vec<PathBuf>,
) -> Vec<PathBuf> {
    path_candidates
        .into_iter()
        .chain(common_candidates)
        .chain(extension_candidates)
        .collect()
}

pub(crate) fn cli_backend_command_names(provider: AiCliBackendKind) -> &'static [&'static str] {
    match provider {
        #[cfg(target_os = "windows")]
        AiCliBackendKind::Codex => &["codex.exe", "codex.cmd"],
        #[cfg(not(target_os = "windows"))]
        AiCliBackendKind::Codex => &["codex"],
        #[cfg(target_os = "windows")]
        AiCliBackendKind::ClaudeCode => &["claude.exe", "claude.cmd"],
        #[cfg(not(target_os = "windows"))]
        AiCliBackendKind::ClaudeCode => &["claude"],
    }
}

pub(crate) fn common_user_bin_candidates(names: &[&str]) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(profile) = std::env::var_os("USERPROFILE") {
        roots.push(PathBuf::from(&profile).join(".local").join("bin"));
    }
    if let Some(nvm_symlink) = std::env::var_os("NVM_SYMLINK") {
        roots.push(PathBuf::from(nvm_symlink));
    }
    if let Some(appdata) = std::env::var_os("APPDATA") {
        roots.push(PathBuf::from(appdata).join("npm"));
    }

    bin_candidates_from_roots(roots, names)
}

pub(crate) fn path_cli_backend_candidates(provider: AiCliBackendKind) -> Vec<PathBuf> {
    let Some(path) = std::env::var_os("PATH") else {
        return Vec::new();
    };
    bin_candidates_from_roots(
        std::env::split_paths(&path).collect(),
        cli_backend_command_names(provider),
    )
}

pub(crate) fn bin_candidates_from_roots(roots: Vec<PathBuf>, names: &[&str]) -> Vec<PathBuf> {
    roots
        .into_iter()
        .flat_map(|root| names.iter().map(move |name| root.join(name)))
        .collect()
}

pub(crate) fn codex_vscode_extension_candidates() -> Vec<PathBuf> {
    let Some(profile) = std::env::var_os("USERPROFILE") else {
        return Vec::new();
    };
    let extensions = PathBuf::from(profile).join(".vscode").join("extensions");
    let Ok(entries) = std::fs::read_dir(extensions) else {
        return Vec::new();
    };
    let mut extension_dirs = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(OsStr::to_str)
                .is_some_and(|name| name.starts_with("openai.chatgpt-"))
        })
        .collect::<Vec<_>>();
    extension_dirs.sort();
    extension_dirs.reverse();
    extension_dirs
        .into_iter()
        .flat_map(|path| {
            codex_extension_arch_dirs()
                .iter()
                .map(move |arch| path.join("bin").join(arch).join("codex.exe"))
        })
        .collect()
}

pub(crate) fn codex_extension_arch_dirs() -> &'static [&'static str] {
    #[cfg(target_arch = "aarch64")]
    {
        &["windows-arm64", "windows-x86_64"]
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        &["windows-x86_64", "windows-arm64"]
    }
}

pub(crate) fn cli_backend_status(provider: AiCliBackendKind, command: String) -> AiCliBackendStatus {
    let version_result = run_cli_capture(&command, &["--version"], None);
    let (installed, version, mut error) = match version_result {
        Ok(output) => (
            true,
            Some(output.trim().to_string()).filter(|v| !v.is_empty()),
            None,
        ),
        Err(message) => (false, None, Some(message)),
    };
    let authenticated = if installed {
        match provider {
            AiCliBackendKind::Codex => run_cli_capture(
                &command,
                &[
                    CODEX_CLI_APPROVAL_FLAG,
                    CODEX_CLI_APPROVAL_NEVER,
                    "exec",
                    CODEX_CLI_IGNORE_USER_CONFIG_FLAG,
                    "--ephemeral",
                    "--sandbox",
                    "read-only",
                    "--skip-git-repo-check",
                    "Reply with exactly OK.",
                ],
                Some(Duration::from_secs(45)),
            )
            .map(|output| output.contains("OK"))
            .unwrap_or_else(|message| {
                error = Some(message);
                false
            }),
            AiCliBackendKind::ClaudeCode => {
                run_cli_capture(&command, &["auth", "status"], Some(Duration::from_secs(20)))
                    .map(|_| true)
                    .unwrap_or_else(|message| {
                        error = Some(message);
                        false
                    })
            }
        }
    } else {
        false
    };
    AiCliBackendStatus {
        provider,
        command,
        installed,
        authenticated,
        version,
        error,
    }
}

pub(crate) fn run_cli_agent_command(
    backend: AiCliBackendKind,
    command: &str,
    model: &str,
    prompt: &str,
) -> Result<String, String> {
    let output = match backend {
        AiCliBackendKind::Codex => run_cli_capture(
            command,
            &[
                CODEX_CLI_APPROVAL_FLAG,
                CODEX_CLI_APPROVAL_NEVER,
                "exec",
                CODEX_CLI_IGNORE_USER_CONFIG_FLAG,
                "--ephemeral",
                "--sandbox",
                "read-only",
                "--skip-git-repo-check",
                "--model",
                model,
                prompt,
            ],
            Some(COPILOT_SDK_RESPONSE_TIMEOUT),
        ),
        AiCliBackendKind::ClaudeCode => run_cli_capture(
            command,
            &[
                "-p",
                "--output-format",
                "text",
                "--tools",
                "",
                "--permission-mode",
                "plan",
                "--no-session-persistence",
                "--model",
                model,
                prompt,
            ],
            Some(COPILOT_SDK_RESPONSE_TIMEOUT),
        ),
    }?;
    let trimmed = output.trim();
    if trimmed.is_empty() {
        return Err(format!(
            "{} did not return assistant text",
            match backend {
                AiCliBackendKind::Codex => "Codex CLI",
                AiCliBackendKind::ClaudeCode => "Claude Code CLI",
            }
        ));
    }
    Ok(trimmed.to_string())
}

pub(crate) fn run_cli_capture(
    command: &str,
    args: &[&str],
    _timeout: Option<Duration>,
) -> Result<String, String> {
    let (program, process_args) = cli_process_invocation(command, args);
    let mut cmd = Command::new(&program);
    cmd.args(&process_args).stdin(Stdio::null());
    crate::installer::proc::no_window(&mut cmd);
    let output = cmd
        .output()
        .map_err(|error| format!("failed to start `{command}`: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if !output.status.success() {
        let detail = if stderr.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            stderr.trim().to_string()
        };
        return Err(format!(
            "`{command}` exited with {}{}",
            output.status,
            if detail.is_empty() {
                String::new()
            } else {
                format!(": {}", truncate_error_body(&detail))
            }
        ));
    }
    if stdout.trim().is_empty() {
        Ok(stderr)
    } else {
        Ok(stdout)
    }
}

pub(crate) fn cli_process_invocation(command: &str, args: &[&str]) -> (String, Vec<String>) {
    #[cfg(target_os = "windows")]
    {
        let lower = command.to_ascii_lowercase();
        if lower.ends_with(".cmd") || lower.ends_with(".bat") {
            let mut process_args = vec![
                "/D".to_string(),
                "/C".to_string(),
                command.to_string(),
            ];
            process_args.extend(args.iter().map(|arg| (*arg).to_string()));
            return ("cmd.exe".to_string(), process_args);
        }
    }

    (
        command.to_string(),
        args.iter().map(|arg| (*arg).to_string()).collect(),
    )
}

pub(crate) fn spawn_external_terminal(command: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("cmd.exe");
        cmd.args([
            "/C",
            "start",
            "KKTerm AI CLI Auth",
            "cmd.exe",
            "/K",
            command,
        ]);
        cmd.spawn()
            .map_err(|error| format!("failed to open external terminal: {error}"))?;
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut cmd = Command::new("sh");
        cmd.args(["-lc", command]);
        cmd.spawn()
            .map_err(|error| format!("failed to start CLI auth command: {error}"))?;
        Ok(())
    }
}

pub(crate) fn shell_quote(value: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("\"{}\"", value.replace('"', "\\\""))
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

pub(crate) fn build_cli_agent_prompt(
    settings: &AiProviderSettings,
    request: AgentRunRequest,
) -> Result<String, String> {
    let prompt = trim_required("assistant prompt", request.prompt)?;
    let context_label = trim_required("assistant context", request.context_label)?;
    let mut out = String::new();
    out.push_str("You are KKTerm's AI Assistant for local-first administration workflows. ");
    out.push_str("Answer concisely. Do not claim to have used KKTerm tools or observed live state unless it appears in the context. ");
    out.push_str("When this turn is running through ACP, KKTerm tools are available through the attached kkterm MCP server. Use kkterm.workspace.connections.create/update/rename/move/delete to manage saved Connections, kkterm.workspace.connection_folders.create/rename/move/delete to organize folders, kkterm.workspace.connections.open to open saved Connections, and the other kkterm tools when they fit the user's request. Connection tools do not accept passwords or other secrets. If ACP is unavailable and the backend falls back to a one-shot CLI command, suggest commands or Connection details for user review instead of claiming that tools ran.\n\n");
    if let Some(custom) =
        normalize_custom_instructions(Some(settings.custom_instructions().to_string()))
    {
        out.push_str(&custom);
        out.push_str("\n\n");
    }
    if let Some(language) = normalize_output_language(request.output_language) {
        out.push_str(&language);
        out.push_str("\n\n");
    }
    out.push_str(&format!(
        "Active context: {context_label}\nAssistant intent: {}\nReasoning effort: {}\n\n",
        normalize_agent_intent(request.intent).as_str(),
        settings.reasoning_effort()
    ));
    if !request.messages.is_empty() {
        out.push_str("Recent chat history:\n");
        for message in request.messages {
            let role = message.role.trim();
            let content = message.content.trim();
            if !role.is_empty() && !content.is_empty() {
                out.push_str(role);
                out.push_str(": ");
                out.push_str(content);
                out.push('\n');
            }
        }
        out.push('\n');
    }
    if let Some(system_context) = request
        .system_context
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        out.push_str("SSH target system context:\n```text\n");
        out.push_str(&system_context);
        out.push_str("\n```\n\n");
    }
    if let Some(selected_output) = request
        .selected_output
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        out.push_str("Selected terminal output:\n```text\n");
        out.push_str(&selected_output);
        out.push_str("\n```\n\n");
    }
    if let Some(page_context) = normalize_page_context(request.page_context) {
        out.push_str("Active page context: ");
        out.push_str(&page_context.source_label);
        out.push_str("\n```text\n");
        out.push_str(&page_context.text);
        out.push_str("\n```\n\n");
    }
    if !request.files.is_empty() || request.screenshot.is_some() || !request.screenshots.is_empty()
    {
        out.push_str("Note: file and screenshot attachments are not passed to the CLI backend in this version.\n\n");
    }
    out.push_str("User request:\n");
    out.push_str(&prompt);
    Ok(out)
}
