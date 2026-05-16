use reqwest::StatusCode;
use serde::{Deserialize, Serialize};

pub(crate) const GITHUB_COPILOT_CLIENT_ID: &str = "Ov23liQ1FCzImI1Fxt4P";
const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_COPILOT_SCOPE: &str = "";

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitHubCopilotDevicePollRequest {
    device_code: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitHubCopilotDeviceFlow {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GitHubCopilotDevicePollResponse {
    status: GitHubCopilotDevicePollStatus,
    interval: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum GitHubCopilotDevicePollStatus {
    Pending,
    SlowDown,
    Authorized,
}

#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: Option<u64>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

pub(crate) fn github_copilot_device_code_form() -> Vec<(&'static str, &'static str)> {
    let mut form = vec![("client_id", GITHUB_COPILOT_CLIENT_ID)];
    if !GITHUB_COPILOT_SCOPE.is_empty() {
        form.push(("scope", GITHUB_COPILOT_SCOPE));
    }
    form
}

pub(crate) async fn start_device_flow() -> Result<GitHubCopilotDeviceFlow, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .form(&github_copilot_device_code_form())
        .send()
        .await
        .map_err(|error| format!("failed to start GitHub Copilot sign-in: {error}"))?;
    let status = response.status();
    let body: DeviceCodeResponse = response
        .json()
        .await
        .map_err(|error| format!("failed to read GitHub Copilot sign-in response: {error}"))?;
    if !status.is_success() || body.error.is_some() {
        return Err(github_error_message(
            "GitHub Copilot sign-in failed",
            body.error,
            body.error_description,
        ));
    }
    Ok(GitHubCopilotDeviceFlow {
        device_code: body.device_code,
        user_code: body.user_code,
        verification_uri: body.verification_uri,
        expires_in: body.expires_in,
        interval: body.interval.unwrap_or(5).max(1),
    })
}

pub(crate) async fn poll_device_flow(
    request: GitHubCopilotDevicePollRequest,
) -> Result<(GitHubCopilotDevicePollResponse, Option<String>), String> {
    if request.device_code.trim().is_empty() {
        return Err("GitHub Copilot device code is required".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .post(GITHUB_ACCESS_TOKEN_URL)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", GITHUB_COPILOT_CLIENT_ID),
            ("device_code", request.device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|error| format!("failed to poll GitHub Copilot sign-in: {error}"))?;
    let status = response.status();
    let body: AccessTokenResponse = response
        .json()
        .await
        .map_err(|error| format!("failed to read GitHub Copilot token response: {error}"))?;

    if let Some(token) = body.access_token.filter(|token| !token.trim().is_empty()) {
        return Ok((
            GitHubCopilotDevicePollResponse {
                status: GitHubCopilotDevicePollStatus::Authorized,
                interval: None,
            },
            Some(token),
        ));
    }

    match body.error.as_deref() {
        Some("authorization_pending") => Ok((
            GitHubCopilotDevicePollResponse {
                status: GitHubCopilotDevicePollStatus::Pending,
                interval: None,
            },
            None,
        )),
        Some("slow_down") => Ok((
            GitHubCopilotDevicePollResponse {
                status: GitHubCopilotDevicePollStatus::SlowDown,
                interval: Some(5),
            },
            None,
        )),
        Some("expired_token") => {
            Err("GitHub Copilot sign-in code expired. Start sign-in again.".to_string())
        }
        Some("access_denied") => Err("GitHub Copilot sign-in was denied.".to_string()),
        Some(_) => Err(github_error_message(
            "GitHub Copilot sign-in failed",
            body.error,
            body.error_description,
        )),
        None if status == StatusCode::OK => {
            Err("GitHub Copilot sign-in did not return a token yet.".to_string())
        }
        None => Err(format!(
            "GitHub Copilot sign-in returned HTTP {}",
            status.as_u16()
        )),
    }
}

fn github_error_message(
    prefix: &str,
    error: Option<String>,
    description: Option<String>,
) -> String {
    match (error, description) {
        (Some(error), Some(description)) => format!("{prefix}: {error}: {description}"),
        (Some(error), None) => format!("{prefix}: {error}"),
        (None, Some(description)) => format!("{prefix}: {description}"),
        (None, None) => prefix.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn device_code_request_uses_public_client_id_only() {
        let form = github_copilot_device_code_form();

        assert!(form.contains(&("client_id", GITHUB_COPILOT_CLIENT_ID)));
        assert!(!form.iter().any(|(key, _)| *key == "client_secret"));
    }
}
