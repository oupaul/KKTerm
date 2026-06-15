//! Minimal native SOCKS5 client.
//!
//! SSH terminal, tmux, SFTP, port-forward, and key-transfer connections route
//! through this dialer when a SOCKS proxy is configured, so the in-process
//! `russh` transport works through a proxy on every platform without depending
//! on an external `nc`/`ProxyCommand` helper. Implements the CONNECT command
//! from RFC 1928 with the no-authentication method.

use std::net::{Ipv4Addr, Ipv6Addr};

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// Validate and normalize a SOCKS proxy endpoint of the form `host:port`.
///
/// Returns the trimmed value or a human-readable error. IPv6 endpoints must be
/// bracketed (`[::1]:1080`). Shell metacharacters are rejected so the value is
/// safe to embed in an OpenSSH `ProxyCommand` on the system-ssh fallback path.
pub fn validate_socks_proxy(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("SOCKS proxy must not be empty".to_string());
    }

    let (host, port) = split_host_port(trimmed)?;
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

    Ok(trimmed.to_string())
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
/// at `proxy` (`host:port`). The returned stream is the live tunnel and can be
/// handed directly to `russh::client::connect_stream`.
pub async fn connect_via_socks5(
    proxy: &str,
    target_host: &str,
    target_port: u16,
) -> Result<TcpStream, String> {
    let proxy = validate_socks_proxy(proxy)?;
    let mut stream = TcpStream::connect(proxy.as_str())
        .await
        .map_err(|error| format!("failed to connect to SOCKS proxy {proxy}: {error}"))?;
    let _ = stream.set_nodelay(true);

    // Greeting: SOCKS5, one method offered: no authentication required.
    stream
        .write_all(&[0x05, 0x01, 0x00])
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
        0x00 => {}
        0xFF => {
            return Err(
                "SOCKS proxy requires authentication, which is not supported (use an unauthenticated SOCKS5 proxy)"
                    .to_string(),
            );
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
}
