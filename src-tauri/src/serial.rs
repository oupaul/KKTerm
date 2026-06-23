use crate::sessions::emit_terminal_output;
use serial2::SerialPort;
use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tauri::AppHandle;

pub struct NativeSerialTerminal {
    writer: SerialPort,
    closed: Arc<AtomicBool>,
}

#[derive(Clone)]
pub struct NativeSerialTerminalRequest {
    pub session_id: String,
    pub line: String,
    pub speed: u32,
}

impl NativeSerialTerminal {
    pub fn write_input(&mut self, data: Vec<u8>) -> Result<(), String> {
        self.writer
            .write_all(&data)
            .map_err(|error| format!("failed to write serial input: {error}"))?;
        self.writer
            .flush()
            .map_err(|error| format!("failed to flush serial input: {error}"))
    }

    pub fn close(self) {
        self.closed.store(true, Ordering::Relaxed);
    }
}

/// Enumerate serial ports the OS currently exposes.
///
/// Backed by `serial2`, which scans IOKit on macOS (`/dev/cu.*`), `/sys/class/tty`
/// on Linux (`/dev/ttyUSB*`, `/dev/ttyACM*`, …) and the `SERIALCOMM` registry on
/// Windows (`COM*`). Enumeration is best-effort: on any error we return an empty
/// list so callers can still fall back to manual entry.
pub fn available_serial_ports() -> Vec<String> {
    let mut ports: Vec<String> = SerialPort::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect();
    ports.sort();
    ports.dedup();
    ports
}

pub fn start_native_terminal(
    app: AppHandle,
    request: NativeSerialTerminalRequest,
) -> Result<NativeSerialTerminal, String> {
    let line = request.line.trim();
    if line.is_empty() {
        return Err("serial line is required".to_string());
    }
    if request.speed == 0 {
        return Err("serial speed must be greater than 0".to_string());
    }

    let mut port = SerialPort::open(line, request.speed)
        .map_err(|error| format!("failed to open serial line {line}: {error}"))?;
    port.set_read_timeout(Duration::from_millis(250))
        .map_err(|error| format!("failed to configure serial read timeout: {error}"))?;
    port.set_write_timeout(Duration::from_secs(5))
        .map_err(|error| format!("failed to configure serial write timeout: {error}"))?;
    let _ = port.set_dtr(true);
    let _ = port.set_rts(true);

    let reader = port
        .try_clone()
        .map_err(|error| format!("failed to create serial reader: {error}"))?;
    let closed = Arc::new(AtomicBool::new(false));
    let reader_closed = Arc::clone(&closed);
    std::thread::spawn(move || {
        let mut buffer = [0_u8; 8192];
        while !reader_closed.load(Ordering::Relaxed) {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(count) => {
                    emit_terminal_output(
                        &app,
                        &request.session_id,
                        terminal_text_from_bytes(&buffer[..count]),
                    );
                }
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                    ) =>
                {
                    continue;
                }
                Err(error) => {
                    emit_terminal_output(
                        &app,
                        &request.session_id,
                        format!("\r\n[serial read error: {error}]\r\n"),
                    );
                    break;
                }
            }
        }
    });

    Ok(NativeSerialTerminal {
        writer: port,
        closed,
    })
}

fn terminal_text_from_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| char::from(*byte)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serial_output_preserves_single_byte_control_and_high_bytes() {
        assert_eq!(
            terminal_text_from_bytes(&[0x1b, b'[', b'A', 0xff]),
            "\u{1b}[A\u{ff}"
        );
    }
}
