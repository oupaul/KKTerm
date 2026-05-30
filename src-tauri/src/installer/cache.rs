use std::collections::HashMap;

use super::detect::DetectedState;
use super::schema::Catalog;

const CACHE_SCHEMA_VERSION: u32 = 1;

pub fn load_detection_cache(catalog: &Catalog) -> HashMap<String, DetectedState> {
    let mut out = HashMap::new();
    for recipe in &catalog.recipes {
        if let Some(state) = read_cached_state(&recipe.id) {
            out.insert(recipe.id.clone(), state);
        }
    }
    out
}

pub fn write_cached_state(tool_id: &str, state: &DetectedState) {
    write_cached_state_platform(tool_id, state);
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedDetectedState {
    schema_version: u32,
    state: DetectedState,
}

#[cfg(target_os = "windows")]
mod windows_cache {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_MORE_DATA, ERROR_SUCCESS};
    use windows_sys::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW, HKEY,
        HKEY_CURRENT_USER, KEY_QUERY_VALUE, KEY_SET_VALUE, REG_SZ,
    };

    use super::{CachedDetectedState, DetectedState, CACHE_SCHEMA_VERSION};

    const CACHE_SUBKEY: &str = r"Software\Ryan Tsai\KKTerm\InstallerDetectionCache";

    struct RegistryKey(HKEY);

    impl Drop for RegistryKey {
        fn drop(&mut self) {
            unsafe {
                let _ = RegCloseKey(self.0);
            }
        }
    }

    pub fn read_cached_state(tool_id: &str) -> Option<DetectedState> {
        let key = open_cache_key(KEY_QUERY_VALUE).ok()?;
        let raw = read_string_value(&key, tool_id).ok()??;
        let cached: CachedDetectedState = serde_json::from_str(&raw).ok()?;
        if cached.schema_version != CACHE_SCHEMA_VERSION {
            return None;
        }
        Some(cached.state)
    }

    pub fn write_cached_state(tool_id: &str, state: &DetectedState) {
        let Ok(key) = create_cache_key() else {
            return;
        };
        let cached = CachedDetectedState {
            schema_version: CACHE_SCHEMA_VERSION,
            state: state.clone(),
        };
        let Ok(raw) = serde_json::to_string(&cached) else {
            return;
        };
        let _ = write_string_value(&key, tool_id, &raw);
    }

    fn create_cache_key() -> Result<RegistryKey, String> {
        let subkey = wide_null(CACHE_SUBKEY);
        let mut key: HKEY = std::ptr::null_mut();
        let status = unsafe {
            RegCreateKeyExW(
                HKEY_CURRENT_USER,
                subkey.as_ptr(),
                0,
                std::ptr::null_mut(),
                0,
                KEY_SET_VALUE,
                std::ptr::null(),
                &mut key,
                std::ptr::null_mut(),
            )
        };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to create installer detection cache key: Windows error {status}"
            ));
        }
        Ok(RegistryKey(key))
    }

    fn open_cache_key(access: u32) -> Result<RegistryKey, String> {
        let subkey = wide_null(CACHE_SUBKEY);
        let mut key: HKEY = std::ptr::null_mut();
        let status =
            unsafe { RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, access, &mut key) };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to open installer detection cache key: Windows error {status}"
            ));
        }
        Ok(RegistryKey(key))
    }

    fn read_string_value(key: &RegistryKey, name: &str) -> Result<Option<String>, String> {
        let value_name = wide_null(name);
        let mut value_type = 0;
        let mut byte_len = 0u32;
        let status = unsafe {
            RegQueryValueExW(
                key.0,
                value_name.as_ptr(),
                std::ptr::null_mut(),
                &mut value_type,
                std::ptr::null_mut(),
                &mut byte_len,
            )
        };
        if status == ERROR_FILE_NOT_FOUND {
            return Ok(None);
        }
        if status != ERROR_SUCCESS && status != ERROR_MORE_DATA {
            return Err(format!(
                "failed to query installer detection cache value `{name}`: Windows error {status}"
            ));
        }
        if value_type != REG_SZ || byte_len == 0 {
            return Ok(None);
        }

        let mut data = vec![0u16; (byte_len as usize + 1) / 2];
        let status = unsafe {
            RegQueryValueExW(
                key.0,
                value_name.as_ptr(),
                std::ptr::null_mut(),
                &mut value_type,
                data.as_mut_ptr().cast::<u8>(),
                &mut byte_len,
            )
        };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to read installer detection cache value `{name}`: Windows error {status}"
            ));
        }
        let len = data.iter().position(|ch| *ch == 0).unwrap_or(data.len());
        Ok(Some(String::from_utf16_lossy(&data[..len])))
    }

    fn write_string_value(key: &RegistryKey, name: &str, value: &str) -> Result<(), String> {
        let value_name = wide_null(name);
        let data = wide_null(value);
        let status = unsafe {
            RegSetValueExW(
                key.0,
                value_name.as_ptr(),
                0,
                REG_SZ,
                data.as_ptr().cast::<u8>(),
                (data.len() * std::mem::size_of::<u16>()) as u32,
            )
        };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to write installer detection cache value `{name}`: Windows error {status}"
            ));
        }
        Ok(())
    }

    fn wide_null(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }
}

#[cfg(target_os = "windows")]
fn read_cached_state(tool_id: &str) -> Option<DetectedState> {
    windows_cache::read_cached_state(tool_id)
}

#[cfg(not(target_os = "windows"))]
fn read_cached_state(_tool_id: &str) -> Option<DetectedState> {
    None
}

#[cfg(target_os = "windows")]
fn write_cached_state_platform(tool_id: &str, state: &DetectedState) {
    windows_cache::write_cached_state(tool_id, state);
}

#[cfg(not(target_os = "windows"))]
fn write_cached_state_platform(_tool_id: &str, _state: &DetectedState) {}
