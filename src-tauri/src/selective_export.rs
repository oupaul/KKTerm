//! Selective, category-aware export/import of the KKTerm SQLite store.
//!
//! Unlike the whole-database export (`storage::export_database`) which packs and
//! replaces the entire file, this module lets the user pick *which* categories
//! ("segments") to carry and, on import, choose per segment whether to skip, add
//! (merge) or replace. The driving use case from issue #378 is sharing SSH/URL
//! Connections with a colleague **without** passwords, while still allowing a
//! passphrase-protected full personal backup.
//!
//! Secrets never travel in the clear: when credentials are included they are
//! pulled from the active credential backend, bundled into `secrets.enc`, and
//! encrypted with an Argon2id-derived AES-256-GCM key (the same envelope the
//! encrypted SQLite secret store uses), unlocked on import with the passphrase.

use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};

use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::Argon2;
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use rusqlite::Connection as SqliteConnection;
use rusqlite::types::{Value as SqlValue, ValueRef};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::State;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

use crate::secrets::{Secrets, StoreSecretRequest};
use crate::storage::{DEFAULT_WORKSPACE_ID, Storage};

const SELECTIVE_FORMAT: &str = "kkterm-selective-export";
const SELECTIVE_VERSION: u32 = 1;
const SECRETS_AAD: &[u8] = b"kkterm-selective-secrets";

/// Per-table primary-key handling used when merging rows into an existing store.
enum Pk {
    /// A standalone text `id` column, regenerated to a fresh id on "add" so a
    /// shared file never collides with the importer's existing rows.
    Generated(&'static str),
    /// The primary key is itself a foreign key to another table (e.g.
    /// `url_credentials.connection_id`); it is rewritten from that table's remap.
    FkPrimary,
    /// A composite/leaf table with no remappable standalone key
    /// (e.g. `connection_tags`); only its foreign keys are rewritten.
    Composite,
    /// A natural key that is upserted rather than remapped (`settings.key`).
    Natural,
}

struct TableSpec {
    name: &'static str,
    pk: Pk,
    /// `(column, referenced_table)` foreign keys to rewrite on merge.
    fks: &'static [(&'static str, &'static str)],
}

/// Tables that make up each segment, listed parent-before-child so inserts honour
/// the `foreign_keys = ON` pragma (deletes for "replace" run in reverse).
fn segment_tables(segment: &str) -> Option<&'static [TableSpec]> {
    match segment {
        "workspaces" => Some(&[TableSpec {
            name: "workspaces",
            pk: Pk::Generated("ws"),
            fks: &[],
        }]),
        "connections" => Some(&[
            TableSpec {
                name: "connection_password_credentials",
                pk: Pk::Generated("cpc"),
                fks: &[("created_from_connection_id", "connections")],
            },
            TableSpec {
                name: "connection_folders",
                pk: Pk::Generated("folder"),
                fks: &[
                    ("parent_folder_id", "connection_folders"),
                    ("workspace_id", "workspaces"),
                ],
            },
            TableSpec {
                name: "connections",
                pk: Pk::Generated("conn"),
                fks: &[
                    ("folder_id", "connection_folders"),
                    ("workspace_id", "workspaces"),
                    ("password_credential_id", "connection_password_credentials"),
                ],
            },
            TableSpec {
                name: "connection_tags",
                pk: Pk::Composite,
                fks: &[("connection_id", "connections")],
            },
            TableSpec {
                name: "url_credentials",
                pk: Pk::FkPrimary,
                fks: &[("connection_id", "connections")],
            },
        ]),
        "dashboards" => Some(&[
            TableSpec {
                name: "dashboard_views",
                pk: Pk::Generated("view"),
                fks: &[],
            },
            TableSpec {
                name: "dashboard_custom_widgets",
                pk: Pk::Generated("cw"),
                fks: &[],
            },
            TableSpec {
                name: "dashboard_widget_instances",
                pk: Pk::Generated("inst"),
                // source_id -> dashboard_custom_widgets only when kind = 'script';
                // built-in source ids are constants and handled specially below.
                fks: &[("view_id", "dashboard_views")],
            },
        ]),
        "settings" => Some(&[TableSpec {
            name: "settings",
            pk: Pk::Natural,
            fks: &[],
        }]),
        "mcpServers" => Some(&[TableSpec {
            name: "mcp_servers",
            pk: Pk::Generated("mcp"),
            fks: &[],
        }]),
        _ => None,
    }
}

/// Fixed processing order so parent segments are imported before segments that
/// may reference them (connections -> dashboards is irrelevant here, but
/// workspaces must precede connections for cross-segment foreign keys).
const SEGMENT_ORDER: &[&str] = &[
    "workspaces",
    "connections",
    "dashboards",
    "settings",
    "mcpServers",
];

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectiveManifest {
    pub product: String,
    pub format: String,
    pub version: u32,
    pub created_at: String,
    pub segments: Vec<String>,
    pub encrypted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectiveExportInfo {
    pub filename: String,
    pub segments: Vec<String>,
    pub encrypted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectiveImportResult {
    pub backup_filename: String,
    pub applied: Vec<String>,
}

/// One credential carried in `secrets.enc`. `owner_id` is the source-machine id;
/// it is rewritten through the import remap so it lands on the merged rows.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecretEntry {
    kind: String,
    owner_id: String,
    secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedBlob {
    kdf: String,
    cipher: String,
    salt: String,
    nonce: String,
    ciphertext: String,
}

// ── Export ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_selective_database(
    storage: State<'_, Storage>,
    secrets: State<'_, Secrets>,
    path: String,
    segments: Vec<String>,
    include_credentials: bool,
    passphrase: Option<String>,
) -> Result<SelectiveExportInfo, String> {
    if segments.is_empty() {
        return Err("select at least one category to export".to_string());
    }
    for segment in &segments {
        if segment_tables(segment).is_none() {
            return Err(format!("unknown export category {segment:?}"));
        }
    }
    if include_credentials {
        if !segments.iter().any(|segment| segment == "connections") {
            return Err("including credentials requires exporting Connections".to_string());
        }
        if passphrase.as_deref().unwrap_or("").is_empty() {
            return Err("a passphrase is required to include credentials".to_string());
        }
    }

    // Serialize the chosen segments' rows.
    let data: Map<String, Value> = storage.with_connection(|conn| {
        let mut data = Map::new();
        for segment in &segments {
            let tables = segment_tables(segment).expect("segment validated above");
            let mut segment_map = Map::new();
            for table in tables {
                let rows = read_table(conn, table.name)?;
                segment_map.insert(table.name.to_string(), Value::Array(rows));
            }
            data.insert(segment.clone(), Value::Object(segment_map));
        }
        Ok(data)
    })?;

    // Collect + encrypt connection secrets when requested.
    let encrypted = include_credentials;
    let secrets_blob = if include_credentials {
        let entries = collect_connection_secrets(&secrets, &data)?;
        let plaintext = serde_json::to_vec(&entries)
            .map_err(|error| format!("failed to serialize secrets: {error}"))?;
        let blob = encrypt_blob(passphrase.as_deref().unwrap_or(""), &plaintext)?;
        Some(
            serde_json::to_vec(&blob)
                .map_err(|error| format!("failed to encode secrets: {error}"))?,
        )
    } else {
        None
    };

    let manifest = SelectiveManifest {
        product: "KKTerm".to_string(),
        format: SELECTIVE_FORMAT.to_string(),
        version: SELECTIVE_VERSION,
        created_at: OffsetDateTime::now_utc()
            .format(&Rfc3339)
            .unwrap_or_else(|_| "unknown".to_string()),
        segments: segments.clone(),
        encrypted,
    };

    write_bundle(
        Path::new(&path),
        &manifest,
        &Value::Object(data),
        secrets_blob.as_deref(),
    )?;

    Ok(SelectiveExportInfo {
        filename: Path::new(&path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&path)
            .to_string(),
        segments,
        encrypted,
    })
}

/// Read every connection-related secret referenced by the exported rows, from
/// the active credential backend. Missing secrets are skipped silently — a
/// Connection may simply not have a saved password.
fn collect_connection_secrets(
    secrets: &Secrets,
    data: &Map<String, Value>,
) -> Result<Vec<SecretEntry>, String> {
    let mut entries = Vec::new();
    let Some(connections) = data.get("connections").and_then(Value::as_object) else {
        return Ok(entries);
    };

    if let Some(rows) = connections
        .get("connection_password_credentials")
        .and_then(Value::as_array)
    {
        for row in rows {
            if let Some(id) = row.get("id").and_then(Value::as_str) {
                if let Some(secret) = secrets.read_connection_password(id.to_string())? {
                    entries.push(SecretEntry {
                        kind: "connectionPassword".to_string(),
                        owner_id: id.to_string(),
                        secret,
                    });
                }
            }
        }
    }

    if let Some(rows) = connections.get("connections").and_then(Value::as_array) {
        for row in rows {
            let Some(id) = row.get("id").and_then(Value::as_str) else {
                continue;
            };
            let connection_type = row
                .get("connection_type")
                .and_then(Value::as_str)
                .unwrap_or("");
            if connection_type == "url" {
                if let Some(secret) = secrets.read_url_password(id.to_string())? {
                    entries.push(SecretEntry {
                        kind: "urlPassword".to_string(),
                        owner_id: id.to_string(),
                        secret,
                    });
                }
            }
            let has_socks = row
                .get("ssh_socks_proxy")
                .and_then(Value::as_str)
                .is_some_and(|value| !value.is_empty());
            if has_socks {
                if let Some(secret) = secrets.read_ssh_socks_proxy_password(id.to_string())? {
                    entries.push(SecretEntry {
                        kind: "sshSocksProxyPassword".to_string(),
                        owner_id: id.to_string(),
                        secret,
                    });
                }
            }
        }
    }

    Ok(entries)
}

// ── Inspect ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn inspect_selective_database(path: String) -> Result<SelectiveManifest, String> {
    let (manifest, _data, _secrets) = read_bundle(Path::new(&path))?;
    Ok(manifest)
}

// ── Import ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn import_selective_database(
    storage: State<'_, Storage>,
    secrets: State<'_, Secrets>,
    path: String,
    actions: HashMap<String, String>,
    passphrase: Option<String>,
) -> Result<SelectiveImportResult, String> {
    let (manifest, data, secrets_blob) = read_bundle(Path::new(&path))?;
    if manifest.format != SELECTIVE_FORMAT {
        return Err(format!("unsupported bundle format {:?}", manifest.format));
    }
    if manifest.version > SELECTIVE_VERSION {
        return Err(format!(
            "bundle version {} is newer than supported ({SELECTIVE_VERSION})",
            manifest.version
        ));
    }
    validate_import_actions(&actions)?;

    // Decrypt secrets up-front so a wrong passphrase fails before any DB write.
    let credential_action = actions
        .get("credentials")
        .map(String::as_str)
        .unwrap_or("skip");
    let secret_entries: Vec<SecretEntry> = if credential_action != "skip" {
        match secrets_blob {
            Some(bytes) => {
                let passphrase = passphrase.as_deref().unwrap_or("");
                if passphrase.is_empty() {
                    return Err("a passphrase is required to import credentials".to_string());
                }
                let blob: EncryptedBlob = serde_json::from_slice(&bytes)
                    .map_err(|error| format!("invalid secrets payload: {error}"))?;
                let plaintext = decrypt_blob(passphrase, &blob)?;
                serde_json::from_slice(&plaintext)
                    .map_err(|error| format!("invalid secrets payload: {error}"))?
            }
            None => Vec::new(),
        }
    } else {
        Vec::new()
    };

    // Safety backup before mutating the live store.
    let backup = storage.backup_database()?;

    // Remap captured across all segments so cross-segment foreign keys resolve.
    let mut remap: HashMap<(String, String), String> = HashMap::new();
    let mut applied: Vec<String> = Vec::new();

    let data_obj = data.as_object().ok_or("bundle data is malformed")?;

    storage.with_connection_mut(|conn| {
        let tx = conn
            .transaction()
            .map_err(|error| format!("failed to begin import: {error}"))?;
        tx.pragma_update(None, "defer_foreign_keys", "ON")
            .map_err(|error| format!("failed to defer import foreign keys: {error}"))?;

        for segment in SEGMENT_ORDER {
            let action = actions.get(*segment).map(String::as_str).unwrap_or("skip");
            if action == "skip" {
                continue;
            }
            let Some(segment_data) = data_obj.get(*segment).and_then(Value::as_object) else {
                continue;
            };
            let tables =
                segment_tables(segment).ok_or_else(|| format!("unknown segment {segment}"))?;
            apply_segment(&tx, tables, segment_data, action, &mut remap)?;
            applied.push((*segment).to_string());
        }

        tx.commit()
            .map_err(|error| format!("failed to commit import: {error}"))?;
        Ok::<(), String>(())
    })?;

    // Write credentials into the active backend, owner ids rewritten via remap.
    if credential_action != "skip" {
        write_secrets(&secrets, &secret_entries, &remap)?;
    }

    Ok(SelectiveImportResult {
        backup_filename: backup.filename().to_string(),
        applied,
    })
}

fn validate_import_actions(actions: &HashMap<String, String>) -> Result<(), String> {
    for (segment, action) in actions {
        if segment != "credentials" && !SEGMENT_ORDER.contains(&segment.as_str()) {
            return Err(format!("unknown import category {segment:?}"));
        }
        if !matches!(action.as_str(), "skip" | "add" | "replace") {
            return Err(format!("unknown import action {action:?} for {segment}"));
        }
    }
    if actions.get("workspaces").map(String::as_str) == Some("replace")
        && actions.get("connections").map(String::as_str) != Some("replace")
    {
        return Err(
            "replacing Workspaces also requires replacing Connections to avoid orphaned or deleted Connections"
                .to_string(),
        );
    }
    Ok(())
}

fn apply_segment(
    tx: &rusqlite::Transaction<'_>,
    tables: &[TableSpec],
    segment_data: &Map<String, Value>,
    action: &str,
    remap: &mut HashMap<(String, String), String>,
) -> Result<(), String> {
    // For "replace", clear the segment's tables child-before-parent first.
    if action == "replace" {
        for table in tables.iter().rev() {
            tx.execute(&format!("DELETE FROM {}", table.name), [])
                .map_err(|error| format!("failed to clear {}: {error}", table.name))?;
        }
    }

    // Pass 1 — assign new primary keys for "add" so nothing collides.
    if action == "add" {
        for table in tables {
            if let Pk::Generated(prefix) = table.pk {
                if let Some(rows) = segment_data.get(table.name).and_then(Value::as_array) {
                    for row in rows {
                        if let Some(old) = row.get("id").and_then(Value::as_str) {
                            remap.insert(
                                (table.name.to_string(), old.to_string()),
                                generate_id(prefix),
                            );
                        }
                    }
                }
            }
        }
    } else {
        // "replace" preserves ids; record identity mappings so cross-segment
        // foreign keys from other segments still resolve to these rows.
        for table in tables {
            if matches!(table.pk, Pk::Generated(_)) {
                if let Some(rows) = segment_data.get(table.name).and_then(Value::as_array) {
                    for row in rows {
                        if let Some(id) = row.get("id").and_then(Value::as_str) {
                            remap
                                .entry((table.name.to_string(), id.to_string()))
                                .or_insert_with(|| id.to_string());
                        }
                    }
                }
            }
        }
    }

    // Pass 2 — rewrite + insert parent-before-child.
    for table in tables {
        let Some(rows) = segment_data.get(table.name).and_then(Value::as_array) else {
            continue;
        };
        for row in rows {
            let Some(row_obj) = row.as_object() else {
                continue;
            };
            if table.name == "settings" {
                upsert_setting(tx, row_obj, action)?;
                continue;
            }
            let mut rewritten = row_obj.clone();
            rewrite_row(tx, table, &mut rewritten, remap)?;
            insert_row(tx, table.name, &rewritten)?;
        }
    }

    Ok(())
}

/// Rewrite a row's primary key and foreign keys against the accumulated remap.
fn rewrite_row(
    tx: &rusqlite::Transaction<'_>,
    table: &TableSpec,
    row: &mut Map<String, Value>,
    remap: &HashMap<(String, String), String>,
) -> Result<(), String> {
    // Primary key.
    match &table.pk {
        Pk::Generated(_) => {
            if let Some(old) = row.get("id").and_then(Value::as_str).map(str::to_string) {
                if let Some(new) = remap.get(&(table.name.to_string(), old)) {
                    row.insert("id".to_string(), Value::String(new.clone()));
                }
            }
        }
        Pk::FkPrimary | Pk::Composite | Pk::Natural => {}
    }

    // Workspaces gain a default flag conflict if two rows claim default; on add
    // we keep only the importer's existing default.
    if table.name == "workspaces" && row.contains_key("is_default") {
        row.insert("is_default".to_string(), Value::from(0));
    }

    // Foreign keys.
    for (column, referenced) in table.fks {
        let Some(old) = row.get(*column).and_then(Value::as_str).map(str::to_string) else {
            continue; // null or absent
        };
        let mut resolved = resolve_fk(tx, referenced, &old, remap)?;
        if *column == "workspace_id" && resolved.is_none() {
            resolved = Some(DEFAULT_WORKSPACE_ID.to_string());
        }
        row.insert((*column).to_string(), value_or_null(resolved));
    }

    // dashboard_widget_instances.source_id references a custom widget only for
    // script widgets; built-in source ids are constants kept verbatim.
    if table.name == "dashboard_widget_instances"
        && row.get("kind").and_then(Value::as_str) == Some("script")
    {
        if let Some(old) = row
            .get("source_id")
            .and_then(Value::as_str)
            .map(str::to_string)
        {
            let resolved = resolve_fk(tx, "dashboard_custom_widgets", &old, remap)?;
            row.insert("source_id".to_string(), value_or_null(resolved));
        }
    }

    Ok(())
}

/// Resolve a foreign-key value: prefer the remap, fall back to an existing local
/// row, otherwise drop the link (the column is nullable for every cross-segment
/// case in our schema).
fn resolve_fk(
    tx: &rusqlite::Transaction<'_>,
    referenced: &str,
    old: &str,
    remap: &HashMap<(String, String), String>,
) -> Result<Option<String>, String> {
    if let Some(new) = remap.get(&(referenced.to_string(), old.to_string())) {
        return Ok(Some(new.clone()));
    }
    if id_exists(tx, referenced, old)? {
        return Ok(Some(old.to_string()));
    }
    Ok(None)
}

fn id_exists(tx: &rusqlite::Transaction<'_>, table: &str, id: &str) -> Result<bool, String> {
    tx.query_row(
        &format!("SELECT 1 FROM {table} WHERE id = ?1 LIMIT 1"),
        [id],
        |_| Ok(true),
    )
    .map_or_else(
        |error| match error {
            rusqlite::Error::QueryReturnedNoRows => Ok(false),
            other => Err(format!("failed to check {table}: {other}")),
        },
        |_| Ok(true),
    )
}

fn upsert_setting(
    tx: &rusqlite::Transaction<'_>,
    row: &Map<String, Value>,
    action: &str,
) -> Result<(), String> {
    let Some(key) = row.get("key").and_then(Value::as_str) else {
        return Ok(());
    };
    let value = row.get("value").and_then(Value::as_str).unwrap_or("");
    // "add" leaves an existing key untouched; "replace" overwrites it.
    let verb = if action == "add" {
        "INSERT OR IGNORE"
    } else {
        "INSERT OR REPLACE"
    };
    tx.execute(
        &format!("{verb} INTO settings (key, value) VALUES (?1, ?2)"),
        rusqlite::params![key, value],
    )
    .map_err(|error| format!("failed to import setting {key}: {error}"))?;
    Ok(())
}

fn write_secrets(
    secrets: &Secrets,
    entries: &[SecretEntry],
    remap: &HashMap<(String, String), String>,
) -> Result<(), String> {
    for entry in entries {
        let (table, kind) = match entry.kind.as_str() {
            "connectionPassword" => ("connection_password_credentials", "connectionPassword"),
            "urlPassword" => ("connections", "urlPassword"),
            "sshSocksProxyPassword" => ("connections", "sshSocksProxyPassword"),
            other => {
                return Err(format!("unsupported credential kind {other:?}"));
            }
        };
        // Map the owner id to the merged row; if the owning Connection was not
        // imported, drop the secret rather than orphan it.
        let owner = remap
            .get(&(table.to_string(), entry.owner_id.clone()))
            .cloned();
        let Some(owner) = owner else {
            continue;
        };
        let request = match kind {
            "connectionPassword" => {
                StoreSecretRequest::connection_password(owner, entry.secret.clone())
            }
            "urlPassword" => StoreSecretRequest::url_password(owner, entry.secret.clone()),
            _ => StoreSecretRequest::ssh_socks_proxy_password(owner, entry.secret.clone()),
        };
        secrets.store_secret(request)?;
    }
    Ok(())
}

// ── Generic row IO ──────────────────────────────────────────────────────────

fn read_table(conn: &SqliteConnection, table: &str) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(&format!("SELECT * FROM {table}"))
        .map_err(|error| format!("failed to read {table}: {error}"))?;
    let columns: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|name| name.to_string())
        .collect();
    let rows = stmt
        .query_map([], |row| {
            let mut map = Map::with_capacity(columns.len());
            for (index, name) in columns.iter().enumerate() {
                map.insert(name.clone(), value_ref_to_json(row.get_ref(index)?));
            }
            Ok(Value::Object(map))
        })
        .map_err(|error| format!("failed to read {table}: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to read {table}: {error}"))?;
    Ok(rows)
}

fn insert_row(
    tx: &rusqlite::Transaction<'_>,
    table: &str,
    row: &Map<String, Value>,
) -> Result<(), String> {
    let columns: Vec<&String> = row.keys().collect();
    if columns.is_empty() {
        return Ok(());
    }
    let placeholders = (1..=columns.len())
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(", ");
    let column_list = columns
        .iter()
        .map(|name| name.as_str())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!("INSERT INTO {table} ({column_list}) VALUES ({placeholders})");
    let params: Vec<SqlValue> = columns
        .iter()
        .map(|name| json_to_sql(&row[*name]))
        .collect();
    tx.execute(&sql, rusqlite::params_from_iter(params))
        .map_err(|error| format!("failed to insert into {table}: {error}"))?;
    Ok(())
}

fn value_ref_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(integer) => Value::from(integer),
        ValueRef::Real(real) => Value::from(real),
        ValueRef::Text(bytes) => Value::String(String::from_utf8_lossy(bytes).into_owned()),
        ValueRef::Blob(bytes) => Value::String(BASE64.encode(bytes)),
    }
}

fn json_to_sql(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(flag) => SqlValue::Integer(i64::from(*flag)),
        Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                SqlValue::Integer(integer)
            } else {
                SqlValue::Real(number.as_f64().unwrap_or(0.0))
            }
        }
        Value::String(text) => SqlValue::Text(text.clone()),
        other => SqlValue::Text(other.to_string()),
    }
}

fn value_or_null(value: Option<String>) -> Value {
    value.map_or(Value::Null, Value::String)
}

// ── Bundle (zip) IO ─────────────────────────────────────────────────────────

fn write_bundle(
    path: &Path,
    manifest: &SelectiveManifest,
    data: &Value,
    secrets: Option<&[u8]>,
) -> Result<(), String> {
    let file = File::create(path)
        .map_err(|error| format!("failed to create export {}: {error}", path.display()))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("manifest.json", options)
        .map_err(|error| format!("failed to write manifest: {error}"))?;
    zip.write_all(
        serde_json::to_string_pretty(manifest)
            .map_err(|error| format!("failed to encode manifest: {error}"))?
            .as_bytes(),
    )
    .map_err(|error| format!("failed to write manifest: {error}"))?;

    zip.start_file("data.json", options)
        .map_err(|error| format!("failed to write data: {error}"))?;
    zip.write_all(
        serde_json::to_string(data)
            .map_err(|error| format!("failed to encode data: {error}"))?
            .as_bytes(),
    )
    .map_err(|error| format!("failed to write data: {error}"))?;

    if let Some(secrets) = secrets {
        zip.start_file("secrets.enc", options)
            .map_err(|error| format!("failed to write secrets: {error}"))?;
        zip.write_all(secrets)
            .map_err(|error| format!("failed to write secrets: {error}"))?;
    }

    zip.finish()
        .map_err(|error| format!("failed to finish export: {error}"))?;
    Ok(())
}

fn read_bundle(path: &Path) -> Result<(SelectiveManifest, Value, Option<Vec<u8>>), String> {
    let file = File::open(path)
        .map_err(|error| format!("failed to open import {}: {error}", path.display()))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("import file is not a valid bundle: {error}"))?;

    let manifest: SelectiveManifest = {
        let mut entry = archive
            .by_name("manifest.json")
            .map_err(|_| "bundle is missing manifest.json".to_string())?;
        let mut text = String::new();
        entry
            .read_to_string(&mut text)
            .map_err(|error| format!("failed to read manifest: {error}"))?;
        serde_json::from_str(&text).map_err(|error| format!("invalid manifest: {error}"))?
    };

    let data: Value = {
        let mut entry = archive
            .by_name("data.json")
            .map_err(|_| "bundle is missing data.json".to_string())?;
        let mut text = String::new();
        entry
            .read_to_string(&mut text)
            .map_err(|error| format!("failed to read data: {error}"))?;
        serde_json::from_str(&text).map_err(|error| format!("invalid data: {error}"))?
    };

    let secrets = match archive.by_name("secrets.enc") {
        Ok(mut entry) => {
            let mut bytes = Vec::new();
            entry
                .read_to_end(&mut bytes)
                .map_err(|error| format!("failed to read secrets: {error}"))?;
            Some(bytes)
        }
        Err(_) => None,
    };

    Ok((manifest, data, secrets))
}

// ── Passphrase crypto (Argon2id + AES-256-GCM) ──────────────────────────────

fn encrypt_blob(passphrase: &str, plaintext: &[u8]) -> Result<EncryptedBlob, String> {
    let salt = Aes256Gcm::generate_nonce(&mut OsRng);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let key = derive_key(passphrase, salt.as_slice())?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|_| "failed to initialize cipher".to_string())?;
    let ciphertext = cipher
        .encrypt(
            &nonce,
            Payload {
                msg: plaintext,
                aad: SECRETS_AAD,
            },
        )
        .map_err(|_| "failed to encrypt secrets".to_string())?;
    Ok(EncryptedBlob {
        kdf: "argon2id".to_string(),
        cipher: "aes-256-gcm".to_string(),
        salt: BASE64.encode(salt),
        nonce: BASE64.encode(nonce),
        ciphertext: BASE64.encode(ciphertext),
    })
}

fn decrypt_blob(passphrase: &str, blob: &EncryptedBlob) -> Result<Vec<u8>, String> {
    if blob.kdf != "argon2id" || blob.cipher != "aes-256-gcm" {
        return Err("unsupported secrets encryption".to_string());
    }
    let salt = BASE64
        .decode(&blob.salt)
        .map_err(|error| format!("failed to decode salt: {error}"))?;
    let nonce_bytes = BASE64
        .decode(&blob.nonce)
        .map_err(|error| format!("failed to decode nonce: {error}"))?;
    let ciphertext = BASE64
        .decode(&blob.ciphertext)
        .map_err(|error| format!("failed to decode ciphertext: {error}"))?;
    let key = derive_key(passphrase, &salt)?;
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|_| "failed to initialize cipher".to_string())?;
    cipher
        .decrypt(
            Nonce::from_slice(&nonce_bytes),
            Payload {
                msg: ciphertext.as_ref(),
                aad: SECRETS_AAD,
            },
        )
        .map_err(|_| "could not decrypt credentials; check the passphrase".to_string())
}

fn derive_key(passphrase: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0_u8; 32];
    Argon2::default()
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|error| format!("failed to derive key: {error}"))?;
    Ok(key)
}

// ── id generation ──────────────────────────────────────────────────────────

static IMPORT_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Unique id for a merged row. The atomic counter guarantees uniqueness even
/// when many rows are remapped within the same millisecond.
fn generate_id(prefix: &str) -> String {
    let timestamp = OffsetDateTime::now_utc().unix_timestamp_nanos();
    let serial = IMPORT_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{prefix}-imp-{timestamp}-{serial}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_round_trips_and_rejects_wrong_passphrase() {
        let plaintext = br#"[{"kind":"connectionPassword","ownerId":"cpc-1","secret":"hunter2"}]"#;
        let blob = encrypt_blob("correct horse", plaintext).expect("encrypt");
        let restored = decrypt_blob("correct horse", &blob).expect("decrypt");
        assert_eq!(restored, plaintext);
        assert!(decrypt_blob("wrong passphrase", &blob).is_err());
    }

    /// Minimal subset of the live schema exercised by the connections segment,
    /// with foreign keys enforced so ordering/remap bugs surface.
    fn connections_schema(conn: &SqliteConnection) {
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL,
                 is_default INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL);
             CREATE TABLE connection_folders (id TEXT PRIMARY KEY, name TEXT NOT NULL,
                 parent_folder_id TEXT REFERENCES connection_folders(id) ON DELETE CASCADE,
                 workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
                 sort_order INTEGER NOT NULL);
             CREATE TABLE connection_password_credentials (id TEXT PRIMARY KEY,
                 label TEXT NOT NULL,
                 created_from_connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL);
             CREATE TABLE connections (id TEXT PRIMARY KEY,
                 folder_id TEXT REFERENCES connection_folders(id) ON DELETE CASCADE,
                 workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
                 name TEXT NOT NULL, connection_type TEXT NOT NULL,
                 ssh_socks_proxy TEXT,
                 password_credential_id TEXT REFERENCES connection_password_credentials(id) ON DELETE SET NULL,
                 sort_order INTEGER NOT NULL);
             CREATE TABLE connection_tags (connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
                 tag TEXT NOT NULL, sort_order INTEGER NOT NULL, PRIMARY KEY (connection_id, tag));
             CREATE TABLE url_credentials (connection_id TEXT PRIMARY KEY REFERENCES connections(id) ON DELETE CASCADE,
                 username TEXT NOT NULL);",
        )
        .expect("schema");
    }

    #[test]
    fn merge_remaps_ids_and_foreign_keys() {
        // Source DB with a workspace -> folder -> connection chain, a reusable
        // password credential, and a tag.
        let src = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&src);
        src.execute_batch(
            "INSERT INTO workspaces (id, name, is_default, sort_order) VALUES ('ws1','Work',1,0);
             INSERT INTO connection_folders (id, name, parent_folder_id, workspace_id, sort_order)
                 VALUES ('f1','Prod',NULL,'ws1',0);
             INSERT INTO connection_password_credentials (id, label, created_from_connection_id)
                 VALUES ('cpc1','root@host',NULL);
             INSERT INTO connections (id, folder_id, workspace_id, name, connection_type,
                 ssh_socks_proxy, password_credential_id, sort_order)
                 VALUES ('c1','f1','ws1','db','ssh',NULL,'cpc1',0);
             INSERT INTO connection_tags (connection_id, tag, sort_order) VALUES ('c1','prod',0);",
        )
        .unwrap();

        let mut ws_seg = Map::new();
        ws_seg.insert(
            "workspaces".to_string(),
            Value::Array(read_table(&src, "workspaces").unwrap()),
        );
        let mut conn_seg = Map::new();
        for spec in segment_tables("connections").unwrap() {
            conn_seg.insert(
                spec.name.to_string(),
                Value::Array(read_table(&src, spec.name).unwrap()),
            );
        }

        // Destination DB starts empty; merge both segments.
        let mut dst = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&dst);
        let mut remap: HashMap<(String, String), String> = HashMap::new();
        {
            let tx = dst.transaction().unwrap();
            apply_segment(
                &tx,
                segment_tables("workspaces").unwrap(),
                &ws_seg,
                "add",
                &mut remap,
            )
            .unwrap();
            apply_segment(
                &tx,
                segment_tables("connections").unwrap(),
                &conn_seg,
                "add",
                &mut remap,
            )
            .unwrap();
            tx.commit().unwrap();
        }

        // The connection landed with fully remapped, internally consistent fks.
        let (conn_id, folder_id, workspace_id, credential_id): (String, String, String, String) =
            dst.query_row(
                "SELECT id, folder_id, workspace_id, password_credential_id FROM connections",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .unwrap();
        assert_ne!(conn_id, "c1", "connection id should be regenerated on add");
        assert_eq!(
            folder_id,
            *remap
                .get(&("connection_folders".to_string(), "f1".to_string()))
                .unwrap()
        );
        assert_eq!(
            workspace_id,
            *remap
                .get(&("workspaces".to_string(), "ws1".to_string()))
                .unwrap()
        );
        assert_eq!(
            credential_id,
            *remap
                .get(&(
                    "connection_password_credentials".to_string(),
                    "cpc1".to_string()
                ))
                .unwrap()
        );

        // The tag followed the connection to its new id.
        let tag_owner: String = dst
            .query_row("SELECT connection_id FROM connection_tags", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(tag_owner, conn_id);
    }

    #[test]
    fn merge_allows_credential_and_connection_cross_references() {
        let src = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&src);
        src.execute_batch(
            "BEGIN;
             PRAGMA defer_foreign_keys = ON;
             INSERT INTO workspaces (id, name, is_default, sort_order) VALUES ('ws1','Work',1,0);
             INSERT INTO connection_password_credentials (id, label, created_from_connection_id)
                 VALUES ('cpc1','root@host','c1');
             INSERT INTO connections (id, folder_id, workspace_id, name, connection_type,
                 ssh_socks_proxy, password_credential_id, sort_order)
                 VALUES ('c1',NULL,'ws1','db','ssh',NULL,'cpc1',0);
             COMMIT;",
        )
        .unwrap();

        let mut ws_seg = Map::new();
        ws_seg.insert(
            "workspaces".to_string(),
            Value::Array(read_table(&src, "workspaces").unwrap()),
        );
        let mut conn_seg = Map::new();
        for spec in segment_tables("connections").unwrap() {
            conn_seg.insert(
                spec.name.to_string(),
                Value::Array(read_table(&src, spec.name).unwrap()),
            );
        }

        let mut dst = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&dst);
        let mut remap: HashMap<(String, String), String> = HashMap::new();
        {
            let tx = dst.transaction().unwrap();
            tx.pragma_update(None, "defer_foreign_keys", "ON").unwrap();
            apply_segment(
                &tx,
                segment_tables("workspaces").unwrap(),
                &ws_seg,
                "add",
                &mut remap,
            )
            .unwrap();
            apply_segment(
                &tx,
                segment_tables("connections").unwrap(),
                &conn_seg,
                "add",
                &mut remap,
            )
            .unwrap();
            tx.commit().unwrap();
        }

        let (credential_owner, connection_credential): (String, String) = dst
            .query_row(
                "SELECT cpc.created_from_connection_id, c.password_credential_id
                 FROM connection_password_credentials cpc
                 JOIN connections c ON c.password_credential_id = cpc.id",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(
            credential_owner,
            *remap
                .get(&("connections".to_string(), "c1".to_string()))
                .unwrap()
        );
        assert_eq!(
            connection_credential,
            *remap
                .get(&(
                    "connection_password_credentials".to_string(),
                    "cpc1".to_string()
                ))
                .unwrap()
        );
    }

    #[test]
    fn validate_import_actions_rejects_unknown_segments_and_actions() {
        let mut actions = HashMap::new();
        actions.insert("connections".to_string(), "add".to_string());
        actions.insert("credentials".to_string(), "skip".to_string());
        assert!(validate_import_actions(&actions).is_ok());

        actions.insert("connections".to_string(), "merge".to_string());
        assert!(validate_import_actions(&actions).is_err());

        actions.clear();
        actions.insert("unknown".to_string(), "add".to_string());
        assert!(validate_import_actions(&actions).is_err());

        actions.clear();
        actions.insert("workspaces".to_string(), "replace".to_string());
        actions.insert("connections".to_string(), "add".to_string());
        assert!(validate_import_actions(&actions).is_err());

        actions.insert("connections".to_string(), "replace".to_string());
        assert!(validate_import_actions(&actions).is_ok());
    }

    #[test]
    fn connections_without_workspace_segment_land_in_default_workspace() {
        let src = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&src);
        src.execute_batch(
            "INSERT INTO workspaces (id, name, is_default, sort_order) VALUES ('ws-source','Work',1,0);
             INSERT INTO connections (id, folder_id, workspace_id, name, connection_type,
                 ssh_socks_proxy, password_credential_id, sort_order)
                 VALUES ('c1',NULL,'ws-source','db','ssh',NULL,NULL,0);",
        )
        .unwrap();

        let mut conn_seg = Map::new();
        for spec in segment_tables("connections").unwrap() {
            conn_seg.insert(
                spec.name.to_string(),
                Value::Array(read_table(&src, spec.name).unwrap()),
            );
        }

        let mut dst = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&dst);
        dst.execute(
            "INSERT INTO workspaces (id, name, is_default, sort_order) VALUES (?1,'Default',1,0)",
            [DEFAULT_WORKSPACE_ID],
        )
        .unwrap();
        let mut remap: HashMap<(String, String), String> = HashMap::new();
        {
            let tx = dst.transaction().unwrap();
            tx.pragma_update(None, "defer_foreign_keys", "ON").unwrap();
            apply_segment(
                &tx,
                segment_tables("connections").unwrap(),
                &conn_seg,
                "add",
                &mut remap,
            )
            .unwrap();
            tx.commit().unwrap();
        }

        let workspace_id: String = dst
            .query_row("SELECT workspace_id FROM connections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(workspace_id, DEFAULT_WORKSPACE_ID);
    }

    #[test]
    fn replace_clears_then_inserts_preserving_ids() {
        let src = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&src);
        src.execute(
            "INSERT INTO workspaces (id, name, is_default, sort_order) VALUES ('ws-src','Imported',0,0)",
            [],
        )
        .unwrap();
        let mut ws_seg = Map::new();
        ws_seg.insert(
            "workspaces".to_string(),
            Value::Array(read_table(&src, "workspaces").unwrap()),
        );

        let mut dst = SqliteConnection::open_in_memory().unwrap();
        connections_schema(&dst);
        dst.execute(
            "INSERT INTO workspaces (id, name, is_default, sort_order) VALUES ('ws-old','Old',0,0)",
            [],
        )
        .unwrap();
        let mut remap = HashMap::new();
        {
            let tx = dst.transaction().unwrap();
            apply_segment(
                &tx,
                segment_tables("workspaces").unwrap(),
                &ws_seg,
                "replace",
                &mut remap,
            )
            .unwrap();
            tx.commit().unwrap();
        }
        let ids: Vec<String> = {
            let mut stmt = dst
                .prepare("SELECT id FROM workspaces ORDER BY id")
                .unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .collect::<Result<_, _>>()
                .unwrap()
        };
        assert_eq!(
            ids,
            vec!["ws-src".to_string()],
            "replace wipes old rows and keeps bundle ids"
        );
    }
}
