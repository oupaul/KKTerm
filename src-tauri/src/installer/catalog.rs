// Catalog fetch + cache + verify pipeline.
//
// Flow on Module entry:
//   1. If cache file is younger than CATALOG_TTL_SECS, use it.
//   2. Otherwise fetch JSON and SIG from CATALOG_URL / CATALOG_SIG_URL.
//   3. Verify SIG against the embedded pubkey before parsing JSON.
//   4. Parse JSON, run Catalog::validate (schema, ids, cycles).
//   5. Atomically rewrite the cache files.
//   6. On any failure after step 1, fall back to the cache (with a warning
//      surfaced to the caller via CatalogSource::CacheFallback).
//
// Live install logic does not live here — see Phase 2.

use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use super::schema::Catalog;
use super::trust;

pub const CATALOG_URL: &str =
    "https://raw.githubusercontent.com/ryantsai/KKTerm/main/installer/catalog.v1.json";
pub const CATALOG_SIG_URL: &str =
    "https://raw.githubusercontent.com/ryantsai/KKTerm/main/installer/catalog.v1.json.minisig";
pub const CATALOG_TTL_SECS: u64 = 60 * 60; // 1 hour

#[derive(Debug)]
pub enum CatalogSource {
    /// Catalog came from a fresh fetch this session.
    Fresh,
    /// Cached catalog is still within TTL.
    CacheWithinTtl,
    /// Fresh fetch failed; cached catalog is being served as a fallback.
    /// The Module page should surface a Status Bar warning.
    CacheFallback { reason: String },
}

pub struct CatalogLoad {
    pub catalog: Catalog,
    pub source: CatalogSource,
}

#[derive(Debug)]
pub enum CatalogError {
    NoCacheAndFetchFailed { reason: String },
    SchemaInvalid(String),
    CacheCorrupt(String),
}

impl std::fmt::Display for CatalogError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoCacheAndFetchFailed { reason } => write!(
                f,
                "installer catalog unavailable: no cached copy and remote fetch failed ({reason})",
            ),
            Self::SchemaInvalid(msg) => write!(f, "installer catalog schema invalid: {msg}"),
            Self::CacheCorrupt(msg) => write!(f, "installer catalog cache corrupt: {msg}"),
        }
    }
}

impl std::error::Error for CatalogError {}

pub fn load_catalog(cache_dir: &PathBuf, force_refresh: bool) -> Result<CatalogLoad, CatalogError> {
    fs::create_dir_all(cache_dir).ok();
    let json_path = cache_dir.join("catalog.cached.json");
    let sig_path = cache_dir.join("catalog.cached.json.minisig");
    let last_fetch_path = cache_dir.join("catalog.lastFetchAt");

    let cache_is_fresh = !force_refresh && cache_age_within_ttl(&last_fetch_path);

    if cache_is_fresh {
        if let Some(catalog) = load_verified_cache(&json_path, &sig_path) {
            return Ok(CatalogLoad {
                catalog,
                source: CatalogSource::CacheWithinTtl,
            });
        }
        // Cache exists but failed to verify/parse — fall through to fetch.
    }

    match fetch_and_verify() {
        Ok((json, sig, catalog)) => {
            atomic_write(&json_path, &json);
            atomic_write(&sig_path, &sig);
            atomic_write(&last_fetch_path, now_unix_seconds().to_string().as_bytes());
            Ok(CatalogLoad {
                catalog,
                source: CatalogSource::Fresh,
            })
        }
        Err(fetch_err) => match load_verified_cache(&json_path, &sig_path) {
            Some(catalog) => Ok(CatalogLoad {
                catalog,
                source: CatalogSource::CacheFallback {
                    reason: fetch_err,
                },
            }),
            None => Err(CatalogError::NoCacheAndFetchFailed { reason: fetch_err }),
        },
    }
}

fn cache_age_within_ttl(last_fetch_path: &PathBuf) -> bool {
    let Ok(text) = fs::read_to_string(last_fetch_path) else {
        return false;
    };
    let Ok(then) = text.trim().parse::<u64>() else {
        return false;
    };
    let now = now_unix_seconds();
    now.saturating_sub(then) < CATALOG_TTL_SECS
}

fn now_unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn load_verified_cache(json_path: &PathBuf, sig_path: &PathBuf) -> Option<Catalog> {
    let json = fs::read(json_path).ok()?;
    let sig = fs::read(sig_path).ok()?;
    if trust::verify_catalog_bytes(&json, &sig).is_err() {
        return None;
    }
    let catalog: Catalog = serde_json::from_slice(&json).ok()?;
    if catalog.validate().is_err() {
        return None;
    }
    Some(catalog)
}

fn fetch_and_verify() -> Result<(Vec<u8>, Vec<u8>, Catalog), String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("KKTerm-Installer/1")
        .build()
        .map_err(|e| format!("http client init failed: {e}"))?;

    let json = client
        .get(CATALOG_URL)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.bytes())
        .map_err(|e| format!("catalog fetch failed: {e}"))?
        .to_vec();

    let sig = client
        .get(CATALOG_SIG_URL)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.bytes())
        .map_err(|e| format!("signature fetch failed: {e}"))?
        .to_vec();

    trust::verify_catalog_bytes(&json, &sig)
        .map_err(|e| format!("signature verification failed: {e}"))?;

    let catalog: Catalog = serde_json::from_slice(&json)
        .map_err(|e| format!("catalog parse failed: {e}"))?;
    catalog
        .validate()
        .map_err(|e| format!("catalog schema invalid: {e}"))?;

    Ok((json, sig, catalog))
}

fn atomic_write(path: &PathBuf, data: &[u8]) {
    let tmp = path.with_extension(format!(
        "{}.tmp",
        path.extension().and_then(|s| s.to_str()).unwrap_or("dat"),
    ));
    if fs::write(&tmp, data).is_ok() {
        let _ = fs::rename(&tmp, path);
    }
}
