//! Global application proxy resolution.
//!
//! KKTerm exposes a single proxy choice in Settings → General with three modes:
//! "Use system settings", "No Proxy", and "Manual" (HTTP/HTTPS/SOCKS5). That
//! choice governs every network activity that runs through `reqwest` — app
//! updates, AI providers, MCP, the Install Helper, favicon/currency fetches,
//! GitHub Copilot, web search, and IT Ops webhooks — as well as the URL
//! WebView2 proxy (resolved on the frontend from the same persisted value).
//!
//! reqwest already auto-detects the operating system proxy by default (env vars
//! on every platform, the WinINET registry on Windows, and SystemConfiguration
//! on macOS), so "Use system settings" is simply reqwest's default behavior.
//! "No Proxy" forces a direct connection with `no_proxy()`, and "Manual" installs
//! an explicit `Proxy::all(..)`.
//!
//! The resolved proxy is cached in a process-global slot that is refreshed at
//! startup and whenever General settings are saved, so the many `reqwest` client
//! builders scattered across the backend can apply it without threading the
//! storage handle through every call site.

use std::sync::{LazyLock, RwLock};

/// The effective global proxy for app/web network activity.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum GlobalProxy {
    /// Use the operating system's proxy configuration (reqwest default).
    #[default]
    System,
    /// Force a direct connection, ignoring any system proxy.
    Direct,
    /// Route through an explicit `<scheme>://host:port` proxy (http/https/socks5).
    Manual(String),
}

static GLOBAL_PROXY: LazyLock<RwLock<GlobalProxy>> =
    LazyLock::new(|| RwLock::new(GlobalProxy::System));

/// Map a persisted General-settings proxy mode + normalized URL to a resolved
/// proxy. Unknown modes and a missing manual URL both fall back to `System`.
pub fn from_settings(mode: &str, url: Option<&str>) -> GlobalProxy {
    match mode.trim() {
        "none" => GlobalProxy::Direct,
        "manual" => match url.map(str::trim).filter(|value| !value.is_empty()) {
            Some(value) => GlobalProxy::Manual(value.to_string()),
            None => GlobalProxy::System,
        },
        _ => GlobalProxy::System,
    }
}

/// Replace the cached global proxy. Called at startup and on settings save.
pub fn set(proxy: GlobalProxy) {
    if let Ok(mut guard) = GLOBAL_PROXY.write() {
        *guard = proxy;
    }
}

/// The currently cached global proxy.
pub fn current() -> GlobalProxy {
    GLOBAL_PROXY
        .read()
        .map(|guard| guard.clone())
        .unwrap_or(GlobalProxy::System)
}

/// Apply the cached global proxy to an async `reqwest` client builder.
pub fn apply_async(builder: reqwest::ClientBuilder) -> reqwest::ClientBuilder {
    match current() {
        GlobalProxy::System => builder,
        GlobalProxy::Direct => builder.no_proxy(),
        GlobalProxy::Manual(url) => match reqwest::Proxy::all(&url) {
            Ok(proxy) => builder.proxy(proxy),
            // An invalid value should never reach the cache (it is validated on
            // save), but fall back to system behavior rather than failing here.
            Err(_) => builder,
        },
    }
}

/// Apply the cached global proxy to a blocking `reqwest` client builder.
pub fn apply_blocking(builder: reqwest::blocking::ClientBuilder) -> reqwest::blocking::ClientBuilder {
    match current() {
        GlobalProxy::System => builder,
        GlobalProxy::Direct => builder.no_proxy(),
        GlobalProxy::Manual(url) => match reqwest::Proxy::all(&url) {
            Ok(proxy) => builder.proxy(proxy),
            Err(_) => builder,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_settings_maps_modes() {
        assert_eq!(from_settings("system", None), GlobalProxy::System);
        assert_eq!(from_settings("none", None), GlobalProxy::Direct);
        assert_eq!(
            from_settings("manual", Some("socks5://127.0.0.1:1080")),
            GlobalProxy::Manual("socks5://127.0.0.1:1080".to_string())
        );
        // Manual without an address is not usable; fall back to system.
        assert_eq!(from_settings("manual", None), GlobalProxy::System);
        assert_eq!(from_settings("manual", Some("  ")), GlobalProxy::System);
        // Unknown modes are treated as system.
        assert_eq!(from_settings("bogus", None), GlobalProxy::System);
    }

    #[test]
    fn cache_round_trips() {
        set(GlobalProxy::Direct);
        assert_eq!(current(), GlobalProxy::Direct);
        set(GlobalProxy::Manual("http://proxy.example:3128".to_string()));
        assert_eq!(
            current(),
            GlobalProxy::Manual("http://proxy.example:3128".to_string())
        );
        set(GlobalProxy::System);
        assert_eq!(current(), GlobalProxy::System);
    }
}
