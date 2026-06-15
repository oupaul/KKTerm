//! Minimal native SOCKS5 client.
//!
//! SSH terminal, tmux, SFTP, port-forward, and key-transfer connections route
//! through this dialer when a SOCKS proxy is configured, so the in-process
//! `russh` transport works through a proxy on every platform without depending
//! on an external `nc`/`ProxyCommand` helper. Implements the CONNECT command
//! from RFC 1928 with both the no-authentication and the username/password
//! (RFC 1929) methods. Credentials are configured inline in the proxy endpoint
//! as `username:password@host:port`.

use std::net::{Ipv4Addr, Ipv6Addr};

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

const METHOD_NO_AUTH: u8 = 0x00;
const METHOD_USERNAME_PASSWORD: u8 = 0x02;
const METHOD_NO_ACCEPTABLE: u8 = 0xFF;
const USERNAME_PASSWORD_VERSION: u8 = 0x01;

/// A parsed SOCKS5 proxy: the `host:port` endpoint to dial plus the optional
/// username/password credentials to present during negotiation.
struct SocksProxy {
    endpoint: String,
    credentials: Option<SocksCredentials>,
}

struct SocksCredentials {
    username: String,
    password: String,
}

/// Validate and normalize a SOCKS proxy value of the form `host:port` or
/// `username:password@host:port`.
///
/// Returns the trimmed value or a human-readable error. IPv6 endpoints must be
/// bracketed (`[::1]:1080`). Shell metacharacters in the host are rejected so
/// the value is safe to embed in an OpenSSH `ProxyCommand` on the system-ssh
/// fallback path.
pub fn validate_socks_proxy(value: &str) -> Result<String, String> {
    parse_socks_proxy(value)?;
    Ok(value.trim().to_string())
}

/// Parse a SOCKS proxy value into its endpoint and optional credentials.
fn parse_socks_proxy(value: &str) -> Result<SocksProxy, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("SOCKS proxy must not be empty".to_string());
    }

    // Split optional `username:password@` credentials from the endpoint. Split
    // on the last '@' so the endpoint never contains one while a password may.
    let (credentials, endpoint) = match trimmed.rsplit_once('@') {
        Some((creds, endpoint)) => (Some(parse_socks_credentials(creds)?), endpoint),
        None => (None, trimmed),
    };

    let (host, port) = split_host_port(endpoint)?;
    if host.is_empty() {
        return Err("SOCKS proxy host must not be empty".to_string());
    }
    if host.contains(char::is_whitespace)
        || host.contains(|c: char| "\"'`$\\;|&<>(){}*?!~".contains(c))
    {
        return Err("SOCKS proxy host contains invalid characters".to_string());
    }

    match port.parse::<u16>() {
        Ok(0) | Err(_) => {
            return Err("SOCKS proxy port must be a number between 1 and 65535".to_string());
        }
        Ok(_) => {}
    }

    Ok(SocksProxy {
        endpoint: endpoint.to_string(),
        credentials,
    })
}

/// Parse the `username:password` section preceding the `@` in a proxy value.
fn parse_socks_credentials(value: &str) -> Result<SocksCredentials, String> {
    // The username runs up to the first ':'; everything after is the password,
    // so a password may itself contain ':'. A bare `user@` means no password.
    let (username, password) = match value.split_once(':') {
        Some((username, password)) => (username, password),
        None => (value, ""),
    };
    if username.is_empty() {
        return Err("SOCKS proxy username must not be empty".to_string());
    }
    // The RFC 1929 length fields are a single byte, capping each value at 255.
    if username.len() > 255 {
        return Err("SOCKS proxy username must be 255 bytes or fewer".to_string());
    }
    if password.len() > 255 {
        return Err("SOCKS proxy password must be 255 bytes or fewer".to_string());
    }
    if username.contains(char::is_control) || password.contains(char::is_control) {
        return Err("SOCKS proxy credentials must not contain control characters".to_string());
    }

    Ok(SocksCredentials {
        username: username.to_string(),
        password: password.to_string(),
    })
}

fn split_host_port(value: &str) -> Result<(&str, &str), String> {
    if let Some(rest) = value.strip_prefix('[') {
        // Bracketed IPv6, e.g. [::1]:1080.
        let close = rest
            .find(']')
            .ok_or_else(|| "SOCKS proxy IPv6 address is missing a closing ']'".to_string())?;
        let host = &rest[..close];
        let port = rest[close + 1..]
            .strip_prefix(':')
            .ok_or_else(|| "SOCKS proxy must be in host:port form".to_string())?;
        return Ok((host, port));
    }

    value
        .rsplit_once(':')
        .ok_or_else(|| "SOCKS proxy must be in host:port form".to_string())
}

/// Open a TCP connection to `target_host:target_port` through the SOCKS5 proxy
/// at `proxy` (`host:port` or `username:password@host:port`). The returned
/// stream is the live tunnel and can be handed directly to
/// `russh::client::connect_stream`.
pub async fn connect_via_socks5(
    proxy: &str,
    target_host: &str,
    target_port: u16,
) -> Result<TcpStream, String> {
    let proxy = parse_socks_proxy(proxy)?;
    let mut stream = TcpStream::connect(proxy.endpoint.as_str())
        .await
        .map_err(|error| format!("failed to connect to SOCKS proxy {}: {error}", proxy.endpoint))?;
    let _ = stream.set_nodelay(true);

    // Greeting: offer username/password (RFC 1929) alongside no-authentication
    // when credentials are configured, otherwise only no-authentication.
    let methods: &[u8] = if proxy.credentials.is_some() {
        &[METHOD_NO_AUTH, METHOD_USERNAME_PASSWORD]
    } else {
        &[METHOD_NO_AUTH]
    };
    let mut greeting = vec![0x05, methods.len() as u8];
    greeting.extend_from_slice(methods);
    stream
        .write_all(&greeting)
        .await
        .map_err(negotiation_error)?;
    let mut method = [0u8; 2];
    stream
        .read_exact(&mut method)
        .await
        .map_err(negotiation_error)?;
    if method[0] != 0x05 {
        return Err("SOCKS proxy returned an unexpected protocol version".to_string());
    }
    match method[1] {
        METHOD_NO_AUTH => {}
        METHOD_USERNAME_PASSWORD => {
            let credentials = proxy.credentials.as_ref().ok_or_else(|| {
                "SOCKS proxy requested username/password authentication but no credentials are configured".to_string()
            })?;
            authenticate_username_password(&mut stream, credentials).await?;
        }
        METHOD_NO_ACCEPTABLE => {
            return Err(if proxy.credentials.is_some() {
                "SOCKS proxy rejected the offered authentication methods (username/password and no-authentication)"
                    .to_string()
            } else {
                "SOCKS proxy requires authentication; configure credentials in the username:password@host:port form"
                    .to_string()
            });
        }
        other => {
            return Err(format!(
                "SOCKS proxy requested unsupported authentication method 0x{other:02x}"
            ));
        }
    }

    // CONNECT request: SOCKS5, CONNECT, reserved, then the destination address.
    let mut request = vec![0x05, 0x01, 0x00];
    if let Ok(addr) = target_host.parse::<Ipv4Addr>() {
        request.push(0x01);
        request.extend_from_slice(&addr.octets());
    } else if let Ok(addr) = target_host.parse::<Ipv6Addr>() {
        request.push(0x04);
        request.extend_from_slice(&addr.octets());
    } else {
        let host_bytes = target_host.as_bytes();
        if host_bytes.len() > 255 {
            return Err("SSH host name is too long for SOCKS5".to_string());
        }
        request.push(0x03);
        request.push(host_bytes.len() as u8);
        request.extend_from_slice(host_bytes);
    }
    request.extend_from_slice(&target_port.to_be_bytes());
    stream
        .write_all(&request)
        .await
        .map_err(negotiation_error)?;

    // Reply header: version, reply code, reserved, address type.
    let mut head = [0u8; 4];
    stream
        .read_exact(&mut head)
        .await
        .map_err(negotiation_error)?;
    if head[0] != 0x05 {
        return Err("SOCKS proxy returned an unexpected protocol version".to_string());
    }
    if head[1] != 0x00 {
        return Err(format!(
            "SOCKS proxy refused the connection: {}",
            reply_message(head[1])
        ));
    }

    // Drain the bound address so the stream is positioned at tunneled data.
    let address_len = match head[3] {
        0x01 => 4,
        0x04 => 16,
        0x03 => {
            let mut len = [0u8; 1];
            stream
                .read_exact(&mut len)
                .await
                .map_err(negotiation_error)?;
            len[0] as usize
        }
        other => {
            return Err(format!(
                "SOCKS proxy returned an unsupported address type 0x{other:02x}"
            ));
        }
    };
    let mut bound = vec![0u8; address_len + 2];
    stream
        .read_exact(&mut bound)
        .await
        .map_err(negotiation_error)?;

    Ok(stream)
}

/// Run the RFC 1929 username/password sub-negotiation on an established stream.
async fn authenticate_username_password(
    stream: &mut TcpStream,
    credentials: &SocksCredentials,
) -> Result<(), String> {
    // Request: version, then length-prefixed username and password. The parsed
    // credentials already guarantee each value fits in a single length byte.
    let username = credentials.username.as_bytes();
    let password = credentials.password.as_bytes();
    let mut request = Vec::with_capacity(3 + username.len() + password.len());
    request.push(USERNAME_PASSWORD_VERSION);
    request.push(username.len() as u8);
    request.extend_from_slice(username);
    request.push(password.len() as u8);
    request.extend_from_slice(password);
    stream
        .write_all(&request)
        .await
        .map_err(negotiation_error)?;

    // Reply: version and a status byte where 0x00 signals success.
    let mut reply = [0u8; 2];
    stream
        .read_exact(&mut reply)
        .await
        .map_err(negotiation_error)?;
    if reply[0] != USERNAME_PASSWORD_VERSION {
        return Err("SOCKS proxy returned an unexpected authentication version".to_string());
    }
    if reply[1] != 0x00 {
        return Err("SOCKS proxy rejected the username and password".to_string());
    }
    Ok(())
}

fn negotiation_error(error: std::io::Error) -> String {
    format!("SOCKS proxy negotiation failed: {error}")
}

fn reply_message(code: u8) -> &'static str {
    match code {
        0x01 => "general SOCKS server failure",
        0x02 => "connection not allowed by ruleset",
        0x03 => "network unreachable",
        0x04 => "host unreachable",
        0x05 => "connection refused",
        0x06 => "TTL expired",
        0x07 => "command not supported",
        0x08 => "address type not supported",
        _ => "unknown error",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_host_port() {
        assert_eq!(
            validate_socks_proxy("  127.0.0.1:1080  ").as_deref(),
            Ok("127.0.0.1:1080")
        );
        assert_eq!(
            validate_socks_proxy("proxy.internal:9050").as_deref(),
            Ok("proxy.internal:9050")
        );
        assert_eq!(
            validate_socks_proxy("[::1]:1080").as_deref(),
            Ok("[::1]:1080")
        );
    }

    #[test]
    fn rejects_missing_port() {
        assert!(validate_socks_proxy("127.0.0.1").is_err());
        assert!(validate_socks_proxy("127.0.0.1:").is_err());
        assert!(validate_socks_proxy("127.0.0.1:0").is_err());
        assert!(validate_socks_proxy("127.0.0.1:notaport").is_err());
    }

    #[test]
    fn rejects_shell_metacharacters() {
        assert!(validate_socks_proxy("127.0.0.1; rm -rf ~:1080").is_err());
        assert!(validate_socks_proxy("$(touch pwned):1080").is_err());
        assert!(validate_socks_proxy("a`b`:1080").is_err());
        assert!(validate_socks_proxy("host with space:1080").is_err());
    }

    #[test]
    fn accepts_credentials() {
        assert_eq!(
            validate_socks_proxy("  user:pass@127.0.0.1:1080  ").as_deref(),
            Ok("user:pass@127.0.0.1:1080")
        );
        assert_eq!(
            validate_socks_proxy("user:pass@[::1]:1080").as_deref(),
            Ok("user:pass@[::1]:1080")
        );
    }

    #[test]
    fn parses_endpoint_and_credentials() {
        let proxy = parse_socks_proxy("user:pass@proxy.internal:1080").expect("parses");
        assert_eq!(proxy.endpoint, "proxy.internal:1080");
        let credentials = proxy.credentials.expect("has credentials");
        assert_eq!(credentials.username, "user");
        assert_eq!(credentials.password, "pass");

        let plain = parse_socks_proxy("proxy.internal:1080").expect("parses");
        assert_eq!(plain.endpoint, "proxy.internal:1080");
        assert!(plain.credentials.is_none());
    }

    #[test]
    fn password_may_contain_separators() {
        // The endpoint splits on the last '@' and the password on the first ':'
        // within the credentials, so both characters survive inside a password.
        let proxy = parse_socks_proxy("user:p@ss:word@host:1080").expect("parses");
        assert_eq!(proxy.endpoint, "host:1080");
        let credentials = proxy.credentials.expect("has credentials");
        assert_eq!(credentials.username, "user");
        assert_eq!(credentials.password, "p@ss:word");
    }

    #[test]
    fn allows_username_without_password() {
        let proxy = parse_socks_proxy("user@host:1080").expect("parses");
        let credentials = proxy.credentials.expect("has credentials");
        assert_eq!(credentials.username, "user");
        assert_eq!(credentials.password, "");
    }

    #[test]
    fn rejects_invalid_credentials() {
        // Empty username.
        assert!(validate_socks_proxy(":pass@host:1080").is_err());
        // Endpoint validation still applies after credentials are stripped.
        assert!(validate_socks_proxy("user:pass@host with space:1080").is_err());
        // Over-long username (256 bytes) cannot fit the RFC 1929 length byte.
        let long_username = "a".repeat(256);
        assert!(validate_socks_proxy(&format!("{long_username}:pass@host:1080")).is_err());
    }
}
