use sha2::{Digest, Sha256};
use std::path::Path;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use tauri::{AppHandle, Runtime};
use windows_sys::Win32::{
    Foundation::{CloseHandle, ERROR_ALREADY_EXISTS, GetLastError, WAIT_OBJECT_0},
    System::Threading::{CreateEventW, CreateMutexW, INFINITE, SetEvent, WaitForSingleObject},
};

pub enum Claim {
    Primary(PortableInstanceGuard),
    Secondary,
}

pub struct PortableInstanceGuard {
    event: isize,
    mutex: isize,
    shutdown: Arc<AtomicBool>,
    listener: Mutex<Option<std::thread::JoinHandle<()>>>,
}

// Windows kernel object handles may be waited and closed from different
// threads. The guard owns both handles and closes them exactly once.
unsafe impl Send for PortableInstanceGuard {}
unsafe impl Sync for PortableInstanceGuard {}

impl PortableInstanceGuard {
    pub fn start_activation_listener<R, F>(&self, app: AppHandle<R>, restore: F)
    where
        R: Runtime,
        F: Fn(&AppHandle<R>) + Send + Sync + 'static,
    {
        let event = self.event;
        let shutdown = self.shutdown.clone();
        let restore = std::sync::Arc::new(restore);
        let listener = std::thread::spawn(move || {
            loop {
                if unsafe { WaitForSingleObject(event as _, INFINITE) } != WAIT_OBJECT_0 {
                    break;
                }
                if shutdown.load(Ordering::Acquire) {
                    break;
                }
                let callback_app = app.clone();
                let callback = restore.clone();
                let _ = app.run_on_main_thread(move || callback(&callback_app));
            }
        });
        if let Ok(mut active_listener) = self.listener.lock() {
            *active_listener = Some(listener);
        }
    }
}

impl Drop for PortableInstanceGuard {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Release);
        unsafe {
            SetEvent(self.event as _);
        }
        if let Ok(listener) = self.listener.get_mut()
            && let Some(listener) = listener.take()
        {
            let _ = listener.join();
        }
        unsafe {
            CloseHandle(self.event as _);
            CloseHandle(self.mutex as _);
        }
    }
}

pub fn claim(data_root: &Path) -> Result<Claim, String> {
    let identity = data_root_identity(data_root)?;
    let event_name = encode_wide(format!("Local\\KKTerm-portable-{identity}-event"));
    let mutex_name = encode_wide(format!("Local\\KKTerm-portable-{identity}-mutex"));

    // Create the auto-reset event before the mutex. If two processes race, a
    // signal from the loser remains pending until the winner starts listening.
    let event = unsafe { CreateEventW(std::ptr::null(), 0, 0, event_name.as_ptr()) };
    if event.is_null() {
        return Err(format!(
            "failed to create portable activation event: {}",
            std::io::Error::last_os_error()
        ));
    }

    let mutex = unsafe { CreateMutexW(std::ptr::null(), 0, mutex_name.as_ptr()) };
    if mutex.is_null() {
        unsafe { CloseHandle(event) };
        return Err(format!(
            "failed to create portable instance mutex: {}",
            std::io::Error::last_os_error()
        ));
    }

    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        let signaled = unsafe { SetEvent(event) } != 0;
        unsafe {
            CloseHandle(event);
            CloseHandle(mutex);
        }
        if !signaled {
            return Err(format!(
                "failed to activate the running portable instance: {}",
                std::io::Error::last_os_error()
            ));
        }
        return Ok(Claim::Secondary);
    }

    Ok(Claim::Primary(PortableInstanceGuard {
        event: event as isize,
        mutex: mutex as isize,
        shutdown: Arc::new(AtomicBool::new(false)),
        listener: Mutex::new(None),
    }))
}

fn data_root_identity(data_root: &Path) -> Result<String, String> {
    let canonical = std::fs::canonicalize(data_root).map_err(|error| {
        format!(
            "failed to resolve portable data directory identity {}: {error}",
            data_root.display()
        )
    })?;
    let normalized = canonical.to_string_lossy().to_lowercase();
    let digest = Sha256::digest(normalized.as_bytes());
    Ok(digest[..8]
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

fn encode_wide(value: impl AsRef<std::ffi::OsStr>) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    value
        .as_ref()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn portable_identity_is_stable_for_the_same_data_root() {
        let root = tempfile::tempdir().expect("portable root");
        let first = data_root_identity(root.path()).expect("first identity");
        let second = data_root_identity(root.path()).expect("second identity");

        assert_eq!(first, second);
        assert_eq!(first.len(), 16);
    }

    #[test]
    fn portable_identity_differs_between_data_roots() {
        let first_root = tempfile::tempdir().expect("first portable root");
        let second_root = tempfile::tempdir().expect("second portable root");

        assert_ne!(
            data_root_identity(first_root.path()).expect("first identity"),
            data_root_identity(second_root.path()).expect("second identity")
        );
    }

    #[test]
    fn second_claim_for_the_same_root_is_secondary_until_primary_drops() {
        let root = tempfile::tempdir().expect("portable root");
        let primary = match claim(root.path()).expect("primary claim") {
            Claim::Primary(guard) => guard,
            Claim::Secondary => panic!("first claim should be primary"),
        };

        assert!(matches!(
            claim(root.path()).expect("secondary claim"),
            Claim::Secondary
        ));
        drop(primary);
        assert!(matches!(
            claim(root.path()).expect("replacement primary claim"),
            Claim::Primary(_)
        ));
    }
}
