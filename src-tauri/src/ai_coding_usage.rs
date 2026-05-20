use crate::storage;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    ffi::{OsStr, OsString},
    io::{BufRead, BufReader, Write},
    path::PathBuf,
    process::{Command, Stdio},
    sync::mpsc,
    time::{Duration, Instant},
};
use tauri_plugin_opener::OpenerExt;
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

const PROVIDERS: [AiCodingUsageProvider; 2] = [
    AiCodingUsageProvider::Codex,
    AiCodingUsageProvider::ClaudeCode,
];
const PROVIDER_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AiCodingUsageProvider {
    Codex,
    ClaudeCode,
}

impl AiCodingUsageProvider {
    fn as_str(self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::ClaudeCode => "claudeCode",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Codex => "Codex",
            Self::ClaudeCode => "Claude Code",
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCodingUsageQuotaWindow {
    used_percent: Option<f64>,
    resets_at: Option<String>,
}

impl AiCodingUsageQuotaWindow {
    fn unknown() -> Self {
        Self {
            used_percent: None,
            resets_at: None,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCodingUsageProviderState {
    provider: AiCodingUsageProvider,
    auth_state: String,
    account_label: Option<String>,
    account_email: Option<String>,
    subscription_plan: Option<String>,
    five_hour: AiCodingUsageQuotaWindow,
    weekly: AiCodingUsageQuotaWindow,
    last_refresh_at: Option<String>,
    last_error: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCodingUsageState {
    providers: Vec<AiCodingUsageProviderState>,
}

#[tauri::command]
pub async fn ai_coding_usage_load(
    storage: tauri::State<'_, storage::Storage>,
) -> Result<AiCodingUsageState, String> {
    storage.with_connection(load_state)
}

#[tauri::command]
pub async fn ai_coding_usage_connect(
    app: tauri::AppHandle,
    storage: tauri::State<'_, storage::Storage>,
    provider: AiCodingUsageProvider,
) -> Result<AiCodingUsageProviderState, String> {
    let cli_paths = provider_cli_paths(&storage)?;
    let result = run_provider_connect(app, provider, cli_paths).await;
    storage.with_connection_mut(|connection| {
        match result {
            Ok(update) => {
                save_provider_update(connection, provider, update)?;
            }
            Err(error) => {
                save_provider_error(connection, provider, &error)?;
            }
        }
        load_provider_state(connection, provider)
    })
}

#[tauri::command]
pub async fn ai_coding_usage_refresh(
    storage: tauri::State<'_, storage::Storage>,
    provider: Option<AiCodingUsageProvider>,
) -> Result<AiCodingUsageState, String> {
    let providers = provider.map_or_else(|| PROVIDERS.to_vec(), |provider| vec![provider]);
    let cli_paths = provider_cli_paths(&storage)?;
    let mut updates = Vec::new();
    for provider in providers {
        updates.push((
            provider,
            run_provider_refresh(provider, cli_paths.clone()).await,
        ));
    }

    storage.with_connection_mut(|connection| {
        for (provider, result) in updates {
            match result {
                Ok(update) => save_provider_update(connection, provider, update)?,
                Err(error) => save_provider_error(connection, provider, &error)?,
            }
        }
        load_state(connection)
    })
}

#[tauri::command]
pub async fn ai_coding_usage_disconnect(
    storage: tauri::State<'_, storage::Storage>,
    provider: AiCodingUsageProvider,
) -> Result<AiCodingUsageProviderState, String> {
    storage.with_connection_mut(|connection| {
        connection
            .execute(
                "DELETE FROM ai_coding_usage_accounts WHERE provider = ?1",
                params![provider.as_str()],
            )
            .map_err(|error| format!("failed to remove usage account: {error}"))?;
        connection
            .execute(
                "DELETE FROM ai_coding_usage_snapshots WHERE provider = ?1",
                params![provider.as_str()],
            )
            .map_err(|error| format!("failed to remove usage snapshot: {error}"))?;
        Ok(disconnected_state(provider))
    })
}

#[derive(Clone, Debug)]
struct ProviderUpdate {
    account_label: Option<String>,
    account_email: Option<String>,
    subscription_plan: Option<String>,
    auth_state: &'static str,
    snapshot: Option<ProviderSnapshot>,
    raw_provider_json: Option<Value>,
    last_error: Option<String>,
}

#[derive(Clone, Debug)]
struct ProviderSnapshot {
    five_hour: AiCodingUsageQuotaWindow,
    weekly: AiCodingUsageQuotaWindow,
}

#[derive(Clone, Debug, Default)]
struct ProviderCliPaths {
    claude: Option<String>,
    codex: Option<String>,
}

fn provider_cli_paths(storage: &storage::Storage) -> Result<ProviderCliPaths, String> {
    let settings = storage.ai_provider_settings()?;
    Ok(ProviderCliPaths {
        claude: settings.claude_cli_path().map(str::to_string),
        codex: settings.codex_cli_path().map(str::to_string),
    })
}

async fn run_provider_connect(
    app: tauri::AppHandle,
    provider: AiCodingUsageProvider,
    cli_paths: ProviderCliPaths,
) -> Result<ProviderUpdate, String> {
    tauri::async_runtime::spawn_blocking(move || match provider {
        AiCodingUsageProvider::Codex => connect_codex(app, &cli_paths),
        AiCodingUsageProvider::ClaudeCode => connect_claude(&cli_paths),
    })
    .await
    .map_err(|error| format!("provider connect task failed: {error}"))?
}

async fn run_provider_refresh(
    provider: AiCodingUsageProvider,
    cli_paths: ProviderCliPaths,
) -> Result<ProviderUpdate, String> {
    tauri::async_runtime::spawn_blocking(move || match provider {
        AiCodingUsageProvider::Codex => refresh_codex(&cli_paths),
        AiCodingUsageProvider::ClaudeCode => refresh_claude(&cli_paths),
    })
    .await
    .map_err(|error| format!("provider refresh task failed: {error}"))?
}

fn load_state(connection: &Connection) -> Result<AiCodingUsageState, String> {
    let providers = PROVIDERS
        .iter()
        .copied()
        .map(|provider| load_provider_state(connection, provider))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(AiCodingUsageState { providers })
}

fn load_provider_state(
    connection: &Connection,
    provider: AiCodingUsageProvider,
) -> Result<AiCodingUsageProviderState, String> {
    let row = connection
        .query_row(
            "SELECT account_label, account_email, subscription_plan, auth_state, last_refresh_at, last_error
             FROM ai_coding_usage_accounts
             WHERE provider = ?1",
            params![provider.as_str()],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to load usage account: {error}"))?;

    let Some((
        account_label,
        account_email,
        subscription_plan,
        auth_state,
        last_refresh_at,
        last_error,
    )) = row
    else {
        return Ok(disconnected_state(provider));
    };

    let snapshot = connection
        .query_row(
            "SELECT five_hour_used_percent, five_hour_resets_at,
                    weekly_used_percent, weekly_resets_at
             FROM ai_coding_usage_snapshots
             WHERE provider = ?1",
            params![provider.as_str()],
            |row| {
                Ok(ProviderSnapshot {
                    five_hour: AiCodingUsageQuotaWindow {
                        used_percent: row.get(0)?,
                        resets_at: row.get(1)?,
                    },
                    weekly: AiCodingUsageQuotaWindow {
                        used_percent: row.get(2)?,
                        resets_at: row.get(3)?,
                    },
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load usage snapshot: {error}"))?;

    Ok(AiCodingUsageProviderState {
        provider,
        auth_state,
        account_label,
        account_email,
        subscription_plan,
        five_hour: snapshot
            .as_ref()
            .map(|snapshot| snapshot.five_hour.clone())
            .unwrap_or_else(AiCodingUsageQuotaWindow::unknown),
        weekly: snapshot
            .as_ref()
            .map(|snapshot| snapshot.weekly.clone())
            .unwrap_or_else(AiCodingUsageQuotaWindow::unknown),
        last_refresh_at,
        last_error,
    })
}

fn disconnected_state(provider: AiCodingUsageProvider) -> AiCodingUsageProviderState {
    AiCodingUsageProviderState {
        provider,
        auth_state: "disconnected".to_string(),
        account_label: None,
        account_email: None,
        subscription_plan: None,
        five_hour: AiCodingUsageQuotaWindow::unknown(),
        weekly: AiCodingUsageQuotaWindow::unknown(),
        last_refresh_at: None,
        last_error: None,
    }
}

fn save_provider_update(
    connection: &Connection,
    provider: AiCodingUsageProvider,
    update: ProviderUpdate,
) -> Result<(), String> {
    let now = now_rfc3339()?;
    let last_error = update.last_error.as_deref().map(scrub_provider_error);
    connection
        .execute(
            "INSERT INTO ai_coding_usage_accounts
                (provider, account_label, account_email, subscription_plan, auth_state, last_refresh_at, last_error, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT(provider) DO UPDATE SET
                account_label = excluded.account_label,
                account_email = excluded.account_email,
                subscription_plan = excluded.subscription_plan,
                auth_state = excluded.auth_state,
                last_refresh_at = excluded.last_refresh_at,
                last_error = excluded.last_error,
                updated_at = CURRENT_TIMESTAMP",
            params![
                provider.as_str(),
                update.account_label,
                update.account_email,
                update.subscription_plan,
                update.auth_state,
                now,
                last_error,
            ],
        )
        .map_err(|error| format!("failed to save usage account: {error}"))?;

    if let Some(snapshot) = update.snapshot {
        let raw_json = update
            .raw_provider_json
            .and_then(|value| serde_json::to_string(&value).ok());
        connection
            .execute(
                "INSERT INTO ai_coding_usage_snapshots
                    (provider, five_hour_used_percent, five_hour_resets_at,
                     weekly_used_percent, weekly_resets_at, raw_provider_json, captured_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(provider) DO UPDATE SET
                    five_hour_used_percent = excluded.five_hour_used_percent,
                    five_hour_resets_at = excluded.five_hour_resets_at,
                    weekly_used_percent = excluded.weekly_used_percent,
                    weekly_resets_at = excluded.weekly_resets_at,
                    raw_provider_json = excluded.raw_provider_json,
                    captured_at = excluded.captured_at",
                params![
                    provider.as_str(),
                    snapshot.five_hour.used_percent,
                    snapshot.five_hour.resets_at,
                    snapshot.weekly.used_percent,
                    snapshot.weekly.resets_at,
                    raw_json,
                    now
                ],
            )
            .map_err(|error| format!("failed to save usage snapshot: {error}"))?;
    }

    Ok(())
}

fn save_provider_error(
    connection: &Connection,
    provider: AiCodingUsageProvider,
    error: &str,
) -> Result<(), String> {
    let scrubbed = scrub_provider_error(error);
    connection
        .execute(
            "INSERT INTO ai_coding_usage_accounts
                (provider, account_label, account_email, auth_state, last_error, created_at, updated_at)
             VALUES (?1, NULL, NULL, 'error', ?2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT(provider) DO UPDATE SET
                auth_state = CASE
                    WHEN auth_state = 'connected' THEN auth_state
                    ELSE 'error'
                END,
                last_error = excluded.last_error,
                updated_at = CURRENT_TIMESTAMP",
            params![provider.as_str(), scrubbed],
        )
        .map_err(|error| format!("failed to save usage error: {error}"))?;
    Ok(())
}

fn connect_codex(
    app: tauri::AppHandle,
    cli_paths: &ProviderCliPaths,
) -> Result<ProviderUpdate, String> {
    let mut session = CodexRpcSession::start(cli_paths)?;
    session.initialize()?;
    let login = session.request(json!({
        "method": "account/login/start",
        "id": 2,
        "params": { "type": "chatgpt" }
    }))?;
    let auth_url = login
        .pointer("/result/authUrl")
        .and_then(Value::as_str)
        .ok_or_else(|| "Codex did not return an OAuth URL.".to_string())?;
    app.opener()
        .open_url(auth_url, None::<&str>)
        .map_err(|error| format!("failed to open Codex OAuth URL: {error}"))?;
    session.wait_for_notification("account/login/completed", PROVIDER_TIMEOUT)?;
    refresh_codex(cli_paths)
}

fn refresh_codex(cli_paths: &ProviderCliPaths) -> Result<ProviderUpdate, String> {
    let mut session = CodexRpcSession::start(cli_paths)?;
    session.initialize()?;
    let account = session.request(json!({
        "method": "account/read",
        "id": 2,
        "params": { "refreshToken": true }
    }))?;
    let rate_limits = session.request(json!({
        "method": "account/rateLimits/read",
        "id": 3,
        "params": {}
    }))?;
    let account_value = account.pointer("/result/account").unwrap_or(&Value::Null);
    if account_value.is_null() {
        return Err("Codex is not connected.".to_string());
    }
    let email = account_value
        .get("email")
        .and_then(Value::as_str)
        .map(str::to_string);
    let plan = account_value
        .get("planType")
        .and_then(Value::as_str)
        .map(str::to_string);
    let snapshot = normalize_codex_rate_limits(&rate_limits);
    Ok(ProviderUpdate {
        account_label: email
            .clone()
            .or_else(|| plan.clone())
            .or_else(|| Some(AiCodingUsageProvider::Codex.label().to_string())),
        account_email: email,
        subscription_plan: plan,
        auth_state: "connected",
        snapshot: Some(snapshot),
        raw_provider_json: Some(rate_limits),
        last_error: None,
    })
}

fn connect_claude(cli_paths: &ProviderCliPaths) -> Result<ProviderUpdate, String> {
    let command = resolve_provider_command(
        cli_paths.claude.as_deref(),
        "claude",
        AiCodingUsageProvider::ClaudeCode,
    );
    run_command(&command, &["auth", "login"], PROVIDER_TIMEOUT)?;
    refresh_claude(cli_paths)
}

fn refresh_claude(cli_paths: &ProviderCliPaths) -> Result<ProviderUpdate, String> {
    let command = resolve_provider_command(
        cli_paths.claude.as_deref(),
        "claude",
        AiCodingUsageProvider::ClaudeCode,
    );
    let output = run_command(
        &command,
        &["auth", "status", "--json"],
        Duration::from_secs(30),
    )?;
    let status_value =
        serde_json::from_str::<Value>(&output).unwrap_or_else(|_| json!({ "text": output }));

    if status_value.get("loggedIn").and_then(Value::as_bool) == Some(false) {
        return Err("Claude Code is not logged in.".to_string());
    }

    let mut update = claude_update_from_status_value(status_value);
    match fetch_claude_oauth_usage() {
        Ok(usage) => {
            update.snapshot = Some(normalize_claude_oauth_usage(&usage));
            update.raw_provider_json = Some(usage);
        }
        Err(error) => {
            update.last_error = Some(error);
        }
    }
    Ok(update)
}

fn claude_update_from_status_value(value: Value) -> ProviderUpdate {
    let email = find_string_key(&value, &["email", "accountEmail", "username"]);
    let label = email
        .clone()
        .or_else(|| find_string_key(&value, &["orgName"]))
        .or_else(|| find_string_key(&value, &["account", "login", "name"]));
    let subscription_plan = find_string_key(&value, &["subscriptionType", "subscription_type"]);
    ProviderUpdate {
        account_label: label
            .or_else(|| Some(AiCodingUsageProvider::ClaudeCode.label().to_string())),
        account_email: email,
        subscription_plan,
        auth_state: "connected",
        snapshot: None,
        raw_provider_json: Some(value),
        last_error: None,
    }
}

const CLAUDE_OAUTH_USAGE_URL: &str = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_OAUTH_BETA_HEADER: &str = "oauth-2025-04-20";

fn fetch_claude_oauth_usage() -> Result<Value, String> {
    let token = read_claude_oauth_token()?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|error| format!("failed to build HTTP client: {error}"))?;
    let response = client
        .get(CLAUDE_OAUTH_USAGE_URL)
        .bearer_auth(&token)
        .header("anthropic-beta", CLAUDE_OAUTH_BETA_HEADER)
        .send()
        .map_err(|error| format!("Claude usage request failed: {error}"))?;
    let status = response.status();
    let retry_after = response
        .headers()
        .get(reqwest::header::RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err(
            "Claude Code OAuth token rejected. Please sign in again with `claude auth login`."
                .to_string(),
        );
    }
    if !status.is_success() {
        return Err(claude_usage_http_error(status, retry_after.as_deref()));
    }
    response
        .json::<Value>()
        .map_err(|error| format!("failed to parse Claude usage response: {error}"))
}

fn claude_usage_http_error(status: reqwest::StatusCode, retry_after: Option<&str>) -> String {
    let Some(retry_after) = retry_after.filter(|value| !value.trim().is_empty()) else {
        return format!("Claude usage endpoint returned HTTP {status}.");
    };
    format!("Claude usage endpoint returned HTTP {status}; retry after {retry_after}s.")
}

fn read_claude_oauth_token() -> Result<String, String> {
    let path = claude_credentials_path().ok_or_else(|| {
        "Claude credentials file is not available on this platform.".to_string()
    })?;
    let content = std::fs::read_to_string(&path).map_err(|error| {
        format!(
            "failed to read Claude credentials at {}: {error}",
            path.display()
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|error| format!("failed to parse Claude credentials: {error}"))?;
    value
        .pointer("/claudeAiOauth/accessToken")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| {
            "Claude credentials do not contain an OAuth access token. Sign in with `claude auth login`."
                .to_string()
        })
}

fn claude_credentials_path() -> Option<PathBuf> {
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
        Some(PathBuf::from(home).join(".claude").join(".credentials.json"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

fn normalize_claude_oauth_usage(value: &Value) -> ProviderSnapshot {
    let five_hour = value
        .pointer("/five_hour")
        .and_then(oauth_usage_window_from_value)
        .unwrap_or_else(AiCodingUsageQuotaWindow::unknown);
    let weekly = value
        .pointer("/seven_day")
        .and_then(oauth_usage_window_from_value)
        .unwrap_or_else(AiCodingUsageQuotaWindow::unknown);
    ProviderSnapshot { five_hour, weekly }
}

fn oauth_usage_window_from_value(value: &Value) -> Option<AiCodingUsageQuotaWindow> {
    let object = value.as_object()?;
    let used_percent = object
        .get("utilization")
        .and_then(Value::as_f64)
        .map(clamp_percent);
    let resets_at = object
        .get("resets_at")
        .and_then(Value::as_str)
        .map(str::to_string);
    Some(AiCodingUsageQuotaWindow {
        used_percent,
        resets_at,
    })
}

struct CodexRpcSession {
    child: std::process::Child,
    stdin: std::process::ChildStdin,
    rx: mpsc::Receiver<String>,
}

impl CodexRpcSession {
    fn start(cli_paths: &ProviderCliPaths) -> Result<Self, String> {
        let command = resolve_provider_command(
            cli_paths.codex.as_deref(),
            "codex",
            AiCodingUsageProvider::Codex,
        );
        let mut child = Command::new(command.as_os_str())
            .args(["app-server", "--listen", "stdio://"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| {
                format!(
                    "failed to start Codex app-server with {}: {error}",
                    command.display()
                )
            })?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "failed to open Codex app-server stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "failed to open Codex app-server stdout".to_string())?;
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                let _ = tx.send(line);
            }
        });
        Ok(Self { child, stdin, rx })
    }

    fn initialize(&mut self) -> Result<(), String> {
        self.write_json(json!({
            "method": "initialize",
            "id": 1,
            "params": {
                "clientInfo": {
                    "name": "kkterm",
                    "title": "KKTerm",
                    "version": env!("CARGO_PKG_VERSION")
                }
            }
        }))?;
        self.wait_for_id(1, Duration::from_secs(20))?;
        self.write_json(json!({ "method": "initialized", "params": {} }))?;
        Ok(())
    }

    fn request(&mut self, message: Value) -> Result<Value, String> {
        let id = message
            .get("id")
            .and_then(Value::as_i64)
            .ok_or_else(|| "Codex request missing id".to_string())?;
        self.write_json(message)?;
        self.wait_for_id(id, Duration::from_secs(60))
    }

    fn wait_for_id(&mut self, id: i64, timeout: Duration) -> Result<Value, String> {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            let remaining = deadline.saturating_duration_since(Instant::now());
            let Ok(line) = self
                .rx
                .recv_timeout(remaining.min(Duration::from_millis(250)))
            else {
                continue;
            };
            if let Ok(value) = serde_json::from_str::<Value>(&line) {
                if value.get("id").and_then(Value::as_i64) == Some(id) {
                    if let Some(error) = value.get("error") {
                        return Err(format!("Codex app-server error: {error}"));
                    }
                    return Ok(value);
                }
            }
        }
        Err("Timed out waiting for Codex app-server.".to_string())
    }

    fn wait_for_notification(&mut self, method: &str, timeout: Duration) -> Result<(), String> {
        let deadline = Instant::now() + timeout;
        while Instant::now() < deadline {
            let remaining = deadline.saturating_duration_since(Instant::now());
            let Ok(line) = self
                .rx
                .recv_timeout(remaining.min(Duration::from_millis(250)))
            else {
                continue;
            };
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            if value.get("method").and_then(Value::as_str) == Some(method) {
                let success = value
                    .pointer("/params/success")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                if success {
                    return Ok(());
                }
                let error = value
                    .pointer("/params/error")
                    .and_then(Value::as_str)
                    .unwrap_or("login failed");
                return Err(format!("Codex login failed: {error}"));
            }
        }
        Err("Timed out waiting for Codex login.".to_string())
    }

    fn write_json(&mut self, value: Value) -> Result<(), String> {
        let line = serde_json::to_string(&value)
            .map_err(|error| format!("failed to serialize Codex RPC: {error}"))?;
        writeln!(self.stdin, "{line}")
            .and_then(|_| self.stdin.flush())
            .map_err(|error| format!("failed to write Codex RPC: {error}"))
    }
}

impl Drop for CodexRpcSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Clone, Debug)]
struct ProviderCommand {
    program: OsString,
    display: String,
}

impl ProviderCommand {
    fn as_os_str(&self) -> &OsStr {
        self.program.as_os_str()
    }

    fn display(&self) -> &str {
        &self.display
    }
}

fn resolve_provider_command(
    configured: Option<&str>,
    fallback_name: &str,
    provider: AiCodingUsageProvider,
) -> ProviderCommand {
    if let Some(path) = configured.filter(|path| !path.trim().is_empty()) {
        return ProviderCommand {
            program: OsString::from(path),
            display: path.to_string(),
        };
    }

    if let Some(path) = common_provider_command_path(provider) {
        return ProviderCommand {
            display: path.display().to_string(),
            program: path.into_os_string(),
        };
    }

    ProviderCommand {
        program: OsString::from(fallback_name),
        display: fallback_name.to_string(),
    }
}

fn common_provider_command_path(provider: AiCodingUsageProvider) -> Option<PathBuf> {
    let names: &[&str] = match provider {
        AiCodingUsageProvider::Codex => &["codex.exe", "codex.cmd"],
        AiCodingUsageProvider::ClaudeCode => &["claude.exe", "claude.cmd"],
    };
    common_user_bin_candidates(names)
        .into_iter()
        .chain(match provider {
            AiCodingUsageProvider::Codex => codex_vscode_extension_candidates(),
            AiCodingUsageProvider::ClaudeCode => Vec::new(),
        })
        .find(|path| path.is_file())
}

fn common_user_bin_candidates(names: &[&str]) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(profile) = std::env::var_os("USERPROFILE") {
        roots.push(PathBuf::from(&profile).join(".local").join("bin"));
    }
    if let Some(appdata) = std::env::var_os("APPDATA") {
        roots.push(PathBuf::from(appdata).join("npm"));
    }
    if let Some(nvm_symlink) = std::env::var_os("NVM_SYMLINK") {
        roots.push(PathBuf::from(nvm_symlink));
    }

    roots
        .into_iter()
        .flat_map(|root| names.iter().map(move |name| root.join(name)))
        .collect()
}

fn codex_vscode_extension_candidates() -> Vec<PathBuf> {
    let Some(profile) = std::env::var_os("USERPROFILE") else {
        return Vec::new();
    };
    let extensions = PathBuf::from(profile).join(".vscode").join("extensions");
    let Ok(entries) = std::fs::read_dir(extensions) else {
        return Vec::new();
    };
    let mut paths = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(OsStr::to_str)
                .is_some_and(|name| name.starts_with("openai.chatgpt-"))
        })
        .map(|path| path.join("bin").join("windows-x86_64").join("codex.exe"))
        .collect::<Vec<_>>();
    paths.sort();
    paths.reverse();
    paths
}

fn run_command(
    command: &ProviderCommand,
    args: &[&str],
    timeout: Duration,
) -> Result<String, String> {
    let mut child = Command::new(command.as_os_str())
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to start {}: {error}", command.display()))?;
    let start = Instant::now();
    loop {
        if start.elapsed() > timeout {
            let _ = child.kill();
            return Err(format!("{} timed out", command.display()));
        }
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("failed to wait for {}: {error}", command.display()))?
        {
            let output = child
                .wait_with_output()
                .map_err(|error| format!("failed to read {} output: {error}", command.display()))?;
            if status.success() {
                return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
            }
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if stderr.is_empty() {
                format!("{} exited with {status}", command.display())
            } else {
                stderr
            });
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

fn normalize_codex_rate_limits(value: &Value) -> ProviderSnapshot {
    let windows = collect_quota_windows(value);
    let five_hour = windows
        .iter()
        .find(|window| {
            window
                .duration_minutes
                .is_some_and(|duration| duration <= 360.0)
        })
        .map(QuotaCandidate::to_window)
        .unwrap_or_else(AiCodingUsageQuotaWindow::unknown);
    let weekly = windows
        .iter()
        .find(|window| {
            window
                .duration_minutes
                .is_some_and(|duration| duration >= 7_000.0)
        })
        .or_else(|| windows.iter().find(|window| window.name_contains("week")))
        .map(QuotaCandidate::to_window)
        .unwrap_or_else(AiCodingUsageQuotaWindow::unknown);
    ProviderSnapshot { five_hour, weekly }
}

#[derive(Debug)]
struct QuotaCandidate {
    used_percent: Option<f64>,
    resets_at: Option<String>,
    duration_minutes: Option<f64>,
    label: Option<String>,
}

impl QuotaCandidate {
    fn to_window(&self) -> AiCodingUsageQuotaWindow {
        AiCodingUsageQuotaWindow {
            used_percent: self.used_percent,
            resets_at: self.resets_at.clone(),
        }
    }

    fn name_contains(&self, needle: &str) -> bool {
        self.label
            .as_ref()
            .is_some_and(|label| label.to_lowercase().contains(needle))
    }
}

fn collect_quota_windows(value: &Value) -> Vec<QuotaCandidate> {
    let mut windows = Vec::new();
    collect_quota_windows_inner(value, None, &mut windows);
    windows
}

fn collect_quota_windows_inner(
    value: &Value,
    label: Option<String>,
    windows: &mut Vec<QuotaCandidate>,
) {
    match value {
        Value::Object(map) => {
            let label = map
                .get("name")
                .or_else(|| map.get("label"))
                .or_else(|| map.get("window"))
                .and_then(Value::as_str)
                .map(str::to_string)
                .or(label);
            let used_percent = numeric_key(map, &["usedPercent", "used_percentage", "percentUsed"]);
            let duration_minutes = numeric_key(map, &["windowDurationMins", "durationMinutes"]);
            let resets_at = map
                .get("resetsAt")
                .or_else(|| map.get("resets_at"))
                .and_then(timestamp_to_rfc3339);
            if used_percent.is_some() || resets_at.is_some() {
                windows.push(QuotaCandidate {
                    used_percent: used_percent.map(clamp_percent),
                    resets_at,
                    duration_minutes,
                    label: label.clone(),
                });
            }
            for nested in map.values() {
                collect_quota_windows_inner(nested, label.clone(), windows);
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_quota_windows_inner(item, label.clone(), windows);
            }
        }
        _ => {}
    }
}

fn numeric_key(map: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<f64> {
    keys.iter()
        .find_map(|key| map.get(*key))
        .and_then(Value::as_f64)
}

fn timestamp_to_rfc3339(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return Some(text.to_string());
    }
    let seconds = value.as_i64()?;
    OffsetDateTime::from_unix_timestamp(seconds)
        .ok()?
        .format(&Rfc3339)
        .ok()
}

fn find_string_key(value: &Value, keys: &[&str]) -> Option<String> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(text) = map.get(*key).and_then(Value::as_str) {
                    return Some(text.to_string());
                }
            }
            map.values()
                .find_map(|nested| find_string_key(nested, keys))
        }
        Value::Array(items) => items
            .iter()
            .find_map(|nested| find_string_key(nested, keys)),
        _ => None,
    }
}

fn clamp_percent(value: f64) -> f64 {
    value.clamp(0.0, 100.0)
}

fn now_rfc3339() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|error| format!("failed to format timestamp: {error}"))
}

fn scrub_provider_error(error: &str) -> String {
    let mut scrubbed = error.replace('\n', " ");
    if scrubbed.len() > 500 {
        scrubbed.truncate(500);
    }
    scrubbed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_claude_oauth_usage() {
        let value = serde_json::json!({
            "five_hour": { "utilization": 23.0, "resets_at": "2026-05-19T18:30:00+00:00" },
            "seven_day": { "utilization": 18.0, "resets_at": "2026-05-25T14:00:00+00:00" },
            "seven_day_opus": null,
            "extra_usage": { "is_enabled": false }
        });

        let snapshot = normalize_claude_oauth_usage(&value);

        assert_eq!(snapshot.five_hour.used_percent, Some(23.0));
        assert_eq!(snapshot.weekly.used_percent, Some(18.0));
        assert_eq!(
            snapshot.five_hour.resets_at.as_deref(),
            Some("2026-05-19T18:30:00+00:00")
        );
        assert_eq!(
            snapshot.weekly.resets_at.as_deref(),
            Some("2026-05-25T14:00:00+00:00")
        );
    }

    #[test]
    fn missing_oauth_usage_window_falls_back_to_unknown() {
        let snapshot = normalize_claude_oauth_usage(&serde_json::json!({}));
        assert!(snapshot.five_hour.used_percent.is_none());
        assert!(snapshot.weekly.used_percent.is_none());
    }

    #[test]
    fn claude_usage_http_error_includes_retry_after() {
        let message = claude_usage_http_error(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            Some("120"),
        );

        assert_eq!(
            message,
            "Claude usage endpoint returned HTTP 429 Too Many Requests; retry after 120s."
        );
    }

    #[test]
    fn claude_auth_status_populates_account_without_snapshot() {
        let value = serde_json::json!({
            "loggedIn": true,
            "authMethod": "claude.ai",
            "email": "ryan@example.com",
            "orgName": "Ryan's Org",
            "subscriptionType": "pro"
        });

        let update = claude_update_from_status_value(value);

        assert_eq!(update.auth_state, "connected");
        assert_eq!(update.account_email.as_deref(), Some("ryan@example.com"));
        assert_eq!(update.account_label.as_deref(), Some("ryan@example.com"));
        assert_eq!(update.subscription_plan.as_deref(), Some("pro"));
        assert_eq!(update.last_error, None);
        assert!(update.snapshot.is_none());
    }

    #[test]
    fn normalizes_codex_rate_limits_from_duration_windows() {
        let value = serde_json::json!({
            "result": {
                "limits": [
                    { "usedPercent": 31.0, "windowDurationMins": 300, "resetsAt": 1770000000 },
                    { "usedPercent": 74.0, "windowDurationMins": 10080, "resetsAt": 1770400000 }
                ]
            }
        });

        let snapshot = normalize_codex_rate_limits(&value);

        assert_eq!(snapshot.five_hour.used_percent, Some(31.0));
        assert_eq!(snapshot.weekly.used_percent, Some(74.0));
    }

    #[test]
    fn clamps_invalid_usage_percentages() {
        assert_eq!(clamp_percent(-5.0), 0.0);
        assert_eq!(clamp_percent(55.0), 55.0);
        assert_eq!(clamp_percent(150.0), 100.0);
    }

    #[test]
    fn provider_labels_are_stable() {
        assert_eq!(AiCodingUsageProvider::Codex.label(), "Codex");
        assert_eq!(AiCodingUsageProvider::ClaudeCode.label(), "Claude Code");
    }

    #[test]
    fn configured_cli_path_wins_over_discovery() {
        let command = resolve_provider_command(
            Some("C:\\Tools\\codex.exe"),
            "codex",
            AiCodingUsageProvider::Codex,
        );

        assert_eq!(command.display(), "C:\\Tools\\codex.exe");
        assert_eq!(command.as_os_str(), OsStr::new("C:\\Tools\\codex.exe"));
    }
}
