use super::{SecretReference, SecretStore};
use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::Argon2;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

const PASSWORD_ENV: &str = "KKTERM_SECRET_STORE_PASSWORD";
const PATH_ENV: &str = "KKTERM_SECRET_STORE_PATH";
const STORE_FILENAME: &str = "secrets.json.enc";
const STORE_VERSION: u8 = 1;
const AES_GCM_NONCE_LENGTH: usize = 12;

pub(super) struct FlatFileSecretStore {
    path: PathBuf,
    password: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedSecretFile {
    version: u8,
    kdf: String,
    cipher: String,
    salt: String,
    nonce: String,
    ciphertext: String,
}

impl FlatFileSecretStore {
    pub(super) fn new(path: PathBuf, password: String) -> Result<Self, String> {
        if password.trim().is_empty() {
            return Err(format!(
                "{PASSWORD_ENV} is required for encrypted file secret storage"
            ));
        }

        Ok(Self { path, password })
    }

    pub(super) fn from_environment() -> Result<Self, String> {
        let password = std::env::var(PASSWORD_ENV)
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                format!("{PASSWORD_ENV} is required for encrypted file secret storage")
            })?;
        Self::new(default_secret_store_path()?, password)
    }

    fn read_all(&self) -> Result<BTreeMap<String, String>, String> {
        if !self.path.exists() {
            return Ok(BTreeMap::new());
        }

        let bytes = fs::read(&self.path).map_err(|error| {
            format!(
                "Could not read encrypted secret store {}: {error}",
                self.path.display()
            )
        })?;
        if bytes.is_empty() {
            return Ok(BTreeMap::new());
        }

        let envelope: EncryptedSecretFile = serde_json::from_slice(&bytes).map_err(|error| {
            format!(
                "Could not parse encrypted secret store {}: {error}",
                self.path.display()
            )
        })?;
        if envelope.version != STORE_VERSION {
            return Err(format!(
                "Encrypted secret store version {} is not supported",
                envelope.version
            ));
        }
        if envelope.kdf != "argon2id" || envelope.cipher != "aes-256-gcm" {
            return Err("Encrypted secret store format is not supported".to_string());
        }

        let salt = BASE64
            .decode(envelope.salt)
            .map_err(|error| format!("Could not decode encrypted secret store salt: {error}"))?;
        let nonce_bytes = BASE64
            .decode(envelope.nonce)
            .map_err(|error| format!("Could not decode encrypted secret store nonce: {error}"))?;
        if nonce_bytes.len() != AES_GCM_NONCE_LENGTH {
            return Err(
                "Could not decode encrypted secret store nonce: invalid length".to_string(),
            );
        }
        let ciphertext = BASE64.decode(envelope.ciphertext).map_err(|error| {
            format!("Could not decode encrypted secret store ciphertext: {error}")
        })?;

        let key = derive_key(&self.password, &salt)?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| "Could not initialize encrypted secret store cipher".to_string())?;
        let plaintext = cipher
            .decrypt(Nonce::from_slice(&nonce_bytes), ciphertext.as_ref())
            .map_err(|_| {
                "could not decrypt encrypted secret store; check the configured password"
                    .to_string()
            })?;

        serde_json::from_slice(&plaintext).map_err(|error| {
            format!(
                "Could not parse decrypted secret store {}: {error}",
                self.path.display()
            )
        })
    }

    fn write_all(&self, secrets: &BTreeMap<String, String>) -> Result<(), String> {
        if secrets.is_empty() {
            if self.path.exists() {
                fs::remove_file(&self.path).map_err(|error| {
                    format!(
                        "Could not remove empty encrypted secret store {}: {error}",
                        self.path.display()
                    )
                })?;
            }
            return Ok(());
        }

        let parent = self.path.parent().ok_or_else(|| {
            "Encrypted secret store path must have a parent directory".to_string()
        })?;
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Could not create encrypted secret store directory {}: {error}",
                parent.display()
            )
        })?;
        set_directory_permissions(parent)?;

        let plaintext = serde_json::to_vec(secrets)
            .map_err(|error| format!("Could not serialize secret store: {error}"))?;
        let salt = Aes256Gcm::generate_nonce(&mut OsRng);
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let key = derive_key(&self.password, salt.as_slice())?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| "Could not initialize encrypted secret store cipher".to_string())?;
        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_ref())
            .map_err(|_| "Could not encrypt secret store".to_string())?;

        let envelope = EncryptedSecretFile {
            version: STORE_VERSION,
            kdf: "argon2id".to_string(),
            cipher: "aes-256-gcm".to_string(),
            salt: BASE64.encode(salt),
            nonce: BASE64.encode(nonce),
            ciphertext: BASE64.encode(ciphertext),
        };
        let bytes = serde_json::to_vec_pretty(&envelope)
            .map_err(|error| format!("Could not serialize encrypted secret store: {error}"))?;
        let temp_path = self.path.with_extension("json.enc.tmp");
        fs::write(&temp_path, bytes).map_err(|error| {
            format!(
                "Could not write encrypted secret store {}: {error}",
                temp_path.display()
            )
        })?;
        set_file_permissions(&temp_path)?;
        fs::rename(&temp_path, &self.path).map_err(|error| {
            format!(
                "Could not replace encrypted secret store {}: {error}",
                self.path.display()
            )
        })?;
        set_file_permissions(&self.path)
    }
}

impl SecretStore for FlatFileSecretStore {
    fn write(&self, reference: &SecretReference, secret: &str) -> Result<(), String> {
        let mut secrets = self.read_all()?;
        secrets.insert(reference.key(), secret.to_string());
        self.write_all(&secrets)
    }

    fn read(&self, reference: &SecretReference) -> Result<Option<String>, String> {
        self.read_all()
            .map(|secrets| secrets.get(&reference.key()).cloned())
    }

    fn delete(&self, reference: &SecretReference) -> Result<(), String> {
        let mut secrets = self.read_all()?;
        secrets.remove(&reference.key());
        self.write_all(&secrets)
    }

    fn exists(&self, reference: &SecretReference) -> Result<bool, String> {
        self.read_all()
            .map(|secrets| secrets.contains_key(&reference.key()))
    }
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0_u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|error| format!("Could not derive encrypted secret store key: {error}"))?;
    Ok(key)
}

fn default_secret_store_path() -> Result<PathBuf, String> {
    if let Some(path) = std::env::var_os(PATH_ENV).filter(|value| !value.is_empty()) {
        return Ok(PathBuf::from(path));
    }

    default_secret_store_dir().map(|directory| directory.join(STORE_FILENAME))
}

#[cfg(target_os = "linux")]
fn default_secret_store_dir() -> Result<PathBuf, String> {
    if let Some(data_home) = std::env::var_os("XDG_DATA_HOME").filter(|value| !value.is_empty()) {
        return Ok(PathBuf::from(data_home).join(super::SERVICE_NAME));
    }

    let home = std::env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            format!("HOME or {PATH_ENV} is required for encrypted file secret storage")
        })?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join(super::SERVICE_NAME))
}

#[cfg(target_os = "macos")]
fn default_secret_store_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            format!("HOME or {PATH_ENV} is required for encrypted file secret storage")
        })?;
    Ok(PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join(super::SERVICE_NAME))
}

#[cfg(target_os = "windows")]
fn default_secret_store_dir() -> Result<PathBuf, String> {
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA").filter(|value| !value.is_empty())
    {
        return Ok(PathBuf::from(local_app_data).join("KKTerm"));
    }

    let user_profile = std::env::var_os("USERPROFILE")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            format!("LOCALAPPDATA, USERPROFILE, or {PATH_ENV} is required for encrypted file secret storage")
        })?;
    Ok(PathBuf::from(user_profile)
        .join("AppData")
        .join("Local")
        .join("KKTerm"))
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn default_secret_store_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            format!("HOME or {PATH_ENV} is required for encrypted file secret storage")
        })?;
    Ok(PathBuf::from(home).join(".kkterm"))
}

#[cfg(unix)]
fn set_directory_permissions(path: &std::path::Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o700)).map_err(|error| {
        format!(
            "Could not restrict encrypted secret store directory {}: {error}",
            path.display()
        )
    })
}

#[cfg(not(unix))]
fn set_directory_permissions(_path: &std::path::Path) -> Result<(), String> {
    Ok(())
}

#[cfg(unix)]
fn set_file_permissions(path: &std::path::Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|error| {
        format!(
            "Could not restrict encrypted secret store file {}: {error}",
            path.display()
        )
    })
}

#[cfg(not(unix))]
fn set_file_permissions(_path: &std::path::Path) -> Result<(), String> {
    Ok(())
}
