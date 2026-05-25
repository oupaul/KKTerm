#[cfg(target_os = "windows")]
mod windows_auto_start {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_SUCCESS};
    use windows_sys::Win32::System::Registry::{
        HKEY, HKEY_CURRENT_USER, KEY_SET_VALUE, REG_SZ, RegCloseKey, RegDeleteValueW,
        RegOpenKeyExW, RegSetValueExW,
    };

    const RUN_SUBKEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const RUN_VALUE_NAME: &str = "KKTerm";

    struct RegistryKey(HKEY);

    impl Drop for RegistryKey {
        fn drop(&mut self) {
            unsafe {
                let _ = RegCloseKey(self.0);
            }
        }
    }

    pub fn sync(enabled: bool) -> Result<(), String> {
        let run_key = open_run_key()?;
        let value_name = wide_null(RUN_VALUE_NAME);

        if enabled {
            let command = current_exe_command()?;
            let data = wide_null(&command);
            let status = unsafe {
                RegSetValueExW(
                    run_key.0,
                    value_name.as_ptr(),
                    0,
                    REG_SZ,
                    data.as_ptr().cast::<u8>(),
                    (data.len() * std::mem::size_of::<u16>()) as u32,
                )
            };
            if status != ERROR_SUCCESS {
                return Err(format!(
                    "failed to enable Windows startup for KKTerm: Windows error {status}"
                ));
            }
            return Ok(());
        }

        let status = unsafe { RegDeleteValueW(run_key.0, value_name.as_ptr()) };
        if status == ERROR_SUCCESS || status == ERROR_FILE_NOT_FOUND {
            Ok(())
        } else {
            Err(format!(
                "failed to disable Windows startup for KKTerm: Windows error {status}"
            ))
        }
    }

    fn open_run_key() -> Result<RegistryKey, String> {
        let subkey = wide_null(RUN_SUBKEY);
        let mut key: HKEY = std::ptr::null_mut();
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                subkey.as_ptr(),
                0,
                KEY_SET_VALUE,
                &mut key,
            )
        };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to open Windows startup registry key: Windows error {status}"
            ));
        }
        Ok(RegistryKey(key))
    }

    fn current_exe_command() -> Result<String, String> {
        let path = std::env::current_exe()
            .map_err(|error| format!("failed to resolve KKTerm executable path: {error}"))?;
        Ok(format!("\"{}\"", path.display()))
    }

    fn wide_null(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }
}

pub fn sync_auto_start_with_windows(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        windows_auto_start::sync(enabled)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Ok(())
    }
}
