//! Per-target-kind samplers.
//!
//! Each sampler is responsible for taking one observation. They run inside
//! the per-watchdog tokio task and must be cheap; long-running work (network
//! probes etc.) should use `tokio::task::spawn_blocking` or async I/O — never
//! block the poll loop directly because that delays cancellation.
//!
//! Step 2 adds the PerformanceCounter sampler. Mock is dispatched inline in
//! the registry. Future steps (ping, sshSessionOutputSilence) will add
//! samplers here.

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::performance::PerformanceMonitor;

use super::session_activity::SessionActivityTracker;
use super::{now_ms, types::PerformanceMetric};

/// Take a single PerformanceCounter sample. Returns `Value::Null` for
/// metrics that the underlying monitor cannot report (first-tick rates,
/// unsupported platform).
///
/// The snapshot is roundtripped through JSON rather than reading struct
/// fields directly so this module doesn't have to track changes in
/// `performance.rs`'s field set. Cost: one allocation per poll.
pub fn sample_performance_counter(app: &AppHandle, metric: PerformanceMetric) -> Value {
    let Some(monitor) = app.try_state::<PerformanceMonitor>() else {
        return Value::Null;
    };
    let snapshot = monitor.system_performance_counters_snapshot();
    let json = serde_json::to_value(&snapshot).unwrap_or(Value::Null);
    extract_metric(&json, metric)
}

/// Pure: extract one metric from a JSON-serialized
/// `SystemPerformanceCountersSnapshot`. Tested independently with synthetic
/// snapshots — no Tauri runtime required.
pub fn extract_metric(snapshot: &Value, metric: PerformanceMetric) -> Value {
    match metric {
        PerformanceMetric::CpuPercent => field(snapshot, "cpuPercent"),
        PerformanceMetric::RamPercent => field(snapshot, "ramPercent"),
        PerformanceMetric::CommitPercent => field(snapshot, "commitPercent"),
        PerformanceMetric::DiskFreePercent => field(snapshot, "systemDriveFreePercent"),
        // Virtual: users say "disk over 85%" meaning *used*, but the monitor
        // only reports free. Compute the complement when free is known.
        PerformanceMetric::DiskUsedPercent => snapshot
            .get("systemDriveFreePercent")
            .and_then(|v| v.as_f64())
            .map(|free| Value::from(100.0 - free))
            .unwrap_or(Value::Null),
        PerformanceMetric::NetworkDownBytesPerSec => {
            field(snapshot, "networkDownstreamBytesPerSecond")
        }
        PerformanceMetric::NetworkUpBytesPerSec => field(snapshot, "networkUpstreamBytesPerSecond"),
        PerformanceMetric::AppWorkingSetBytes => field(snapshot, "appWorkingSetBytes"),
        PerformanceMetric::AppPrivateBytes => field(snapshot, "appPrivateBytes"),
        PerformanceMetric::HandleCount => field(snapshot, "handleCount"),
        PerformanceMetric::ProcessCount => field(snapshot, "processCount"),
        PerformanceMetric::ThreadCount => field(snapshot, "threadCount"),
    }
}

fn field(snapshot: &Value, key: &str) -> Value {
    snapshot.get(key).cloned().unwrap_or(Value::Null)
}

/// Sample for `sshSessionOutputSilence` — returns milliseconds since the
/// last terminal byte from this session.
///
/// Behavior when the session has never reported activity (never opened, or
/// just opened with no output yet): returns Value::Null, which makes
/// `SilenceFor` not match — we don't want to fire just because we haven't
/// seen first output yet. Once the session has any byte, subsequent silence
/// is measured from that timestamp.
pub fn sample_ssh_session_silence(app: &AppHandle, session_id: &str) -> Value {
    let Some(tracker) = app.try_state::<std::sync::Arc<SessionActivityTracker>>() else {
        return Value::Null;
    };
    let Some(last) = tracker.last_activity_at(session_id) else {
        return Value::Null;
    };
    let elapsed = now_ms().saturating_sub(last);
    Value::from(elapsed)
}

/// Fetch the trailing output bytes for `sessionOutputTail` context. Used by
/// the snapshot collector when an intervention sub-turn requests it.
pub fn session_output_tail(app: &AppHandle, session_id: &str) -> Option<String> {
    app.try_state::<std::sync::Arc<SessionActivityTracker>>()
        .and_then(|tracker| tracker.tail(session_id))
}

/// TCP-based "is host up" check. Returns 1.0 if a TCP connect succeeds to
/// `port` (default 80) within the timeout, 0.0 otherwise. We use TCP instead
/// of ICMP because ICMP needs OS-level privilege on Windows and is often
/// blocked by firewalls — a TCP probe gives a comparable liveness signal
/// without those caveats.
pub async fn sample_ping(host: &str, port: Option<u16>) -> Value {
    let target_port = port.unwrap_or(80);
    let result = crate::net::scan::tcp_check(host, target_port, Some(2000)).await;
    Value::from(if result.open { 1.0 } else { 0.0 })
}

/// Open/closed check for a specific TCP port.
pub async fn sample_tcp_reachable(host: &str, port: u16) -> Value {
    let result = crate::net::scan::tcp_check(host, port, Some(2000)).await;
    Value::from(if result.open { 1.0 } else { 0.0 })
}

/// Schedule sampler (IT Ops Phase 5). Returns 1.0 when the current local minute
/// matches the cron expression, 0.0 otherwise. The registry's rising-edge
/// detector turns a full matching minute into exactly one trigger, so this is
/// stateless. Pair with a `gte 1` condition. Poll faster than once a minute.
pub fn sample_schedule(cron: &str) -> Value {
    use time::OffsetDateTime;
    let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
    let matched = cron_matches_fields(
        cron,
        now.minute() as u32,
        now.hour() as u32,
        now.day() as u32,
        u8::from(now.month()) as u32,
        now.weekday().number_days_from_sunday() as u32,
    );
    Value::from(if matched { 1.0 } else { 0.0 })
}

/// Validate a 5-field cron expression (minute hour day-of-month month
/// day-of-week). Used by `WatchdogRegistry::create` to reject bad schedules.
pub fn validate_cron(cron: &str) -> Result<(), String> {
    let fields: Vec<&str> = cron.split_whitespace().collect();
    if fields.len() != 5 {
        return Err(format!(
            "cron must have 5 fields (minute hour day month weekday), got {}",
            fields.len()
        ));
    }
    for field in fields {
        for part in field.split(',') {
            if !cron_part_is_valid(part.trim()) {
                return Err(format!("invalid cron field: {part}"));
            }
        }
    }
    Ok(())
}

/// Pure matcher for the broken-down current time. `dow` is 0=Sunday..6=Saturday;
/// a cron `7` in the weekday field also means Sunday.
fn cron_matches_fields(
    cron: &str,
    minute: u32,
    hour: u32,
    day_of_month: u32,
    month: u32,
    dow: u32,
) -> bool {
    let fields: Vec<&str> = cron.split_whitespace().collect();
    if fields.len() != 5 {
        return false;
    }
    cron_field_matches(fields[0], minute)
        && cron_field_matches(fields[1], hour)
        && cron_field_matches(fields[2], day_of_month)
        && cron_field_matches(fields[3], month)
        && (cron_field_matches(fields[4], dow) || (dow == 0 && cron_field_matches(fields[4], 7)))
}

fn cron_field_matches(field: &str, value: u32) -> bool {
    field.split(',').any(|part| cron_part_matches(part.trim(), value))
}

fn cron_part_matches(part: &str, value: u32) -> bool {
    let (range, step) = match part.split_once('/') {
        Some((range, step)) => match step.parse::<u32>() {
            Ok(step) if step > 0 => (range, step),
            _ => return false,
        },
        None => (part, 1),
    };
    let (start, end) = if range == "*" {
        (0, u32::MAX)
    } else if let Some((low, high)) = range.split_once('-') {
        match (low.parse::<u32>(), high.parse::<u32>()) {
            (Ok(low), Ok(high)) => (low, high),
            _ => return false,
        }
    } else {
        match range.parse::<u32>() {
            Ok(single) => (single, single),
            Err(_) => return false,
        }
    };
    value >= start && value <= end && (value - start) % step == 0
}

/// Scan a log file for `pattern` (literal substring) in content appended since
/// `last_size`. Returns the new size to remember and whether the appended chunk
/// matched. The first poll (last_size None) and a truncation/rotation just
/// re-baseline without firing, so only genuinely new lines trigger. IT Ops
/// Phase 5.
pub fn scan_log_appended(path: &str, last_size: Option<u64>, pattern: &str) -> (Option<u64>, bool) {
    let size = match std::fs::metadata(path) {
        Ok(meta) => meta.len(),
        Err(_) => return (None, false),
    };
    let Some(last) = last_size else {
        return (Some(size), false); // first poll: baseline only
    };
    if size <= last {
        return (Some(size), false); // no new content (or rotated/truncated)
    }
    let matched = read_file_range(path, last, size - last)
        .map(|chunk| chunk.contains(pattern))
        .unwrap_or(false);
    (Some(size), matched)
}

fn read_file_range(path: &str, offset: u64, len: u64) -> Option<String> {
    use std::io::{Read, Seek, SeekFrom};
    let mut file = std::fs::File::open(path).ok()?;
    file.seek(SeekFrom::Start(offset)).ok()?;
    let cap = len.min(1_000_000) as usize; // cap one read at 1 MB
    let mut buffer = vec![0u8; cap];
    let read = file.read(&mut buffer).ok()?;
    Some(String::from_utf8_lossy(&buffer[..read]).into_owned())
}

/// OutputMatch sampler — 1.0 if the live SSH Session's recent output contains
/// `pattern` (literal substring). Reads the same rolling buffer as
/// `sample_ssh_session_silence`; the rising-edge detector means a steady match
/// fires once until it scrolls out of the tail.
pub fn sample_output_match(app: &AppHandle, session_id: &str, pattern: &str) -> Value {
    let matched = app
        .try_state::<std::sync::Arc<SessionActivityTracker>>()
        .and_then(|tracker| tracker.tail(session_id))
        .map(|tail| tail.contains(pattern))
        .unwrap_or(false);
    Value::from(if matched { 1.0 } else { 0.0 })
}

fn cron_part_is_valid(part: &str) -> bool {
    if part == "*" {
        return true;
    }
    let (range, step_ok) = match part.split_once('/') {
        Some((range, step)) => (range, step.parse::<u32>().map(|s| s > 0).unwrap_or(false)),
        None => (part, true),
    };
    if !step_ok {
        return false;
    }
    if range == "*" {
        return true;
    }
    if let Some((low, high)) = range.split_once('-') {
        return low.parse::<u32>().is_ok() && high.parse::<u32>().is_ok();
    }
    range.parse::<u32>().is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn fake_snapshot() -> Value {
        json!({
            "cpuPercent": 42.5,
            "ramPercent": 70.0,
            "commitPercent": 60.0,
            "systemDriveFreePercent": 30.0,
            "networkDownstreamBytesPerSecond": 1_000_000.0,
            "networkUpstreamBytesPerSecond": 50_000.0,
            "appWorkingSetBytes": 200_000_000_u64,
            "handleCount": 1234,
            "processCount": 250,
            "threadCount": 3500
        })
    }

    #[test]
    fn extracts_simple_metric() {
        assert_eq!(
            extract_metric(&fake_snapshot(), PerformanceMetric::CpuPercent),
            json!(42.5)
        );
        assert_eq!(
            extract_metric(&fake_snapshot(), PerformanceMetric::RamPercent),
            json!(70.0)
        );
        assert_eq!(
            extract_metric(&fake_snapshot(), PerformanceMetric::HandleCount),
            json!(1234)
        );
    }

    #[test]
    fn disk_used_is_complement_of_free() {
        // 30% free → 70% used. Matches the user's natural "disk over 85%" phrasing.
        assert_eq!(
            extract_metric(&fake_snapshot(), PerformanceMetric::DiskUsedPercent),
            json!(70.0)
        );
    }

    #[test]
    fn missing_field_yields_null() {
        let empty = json!({});
        assert_eq!(
            extract_metric(&empty, PerformanceMetric::CpuPercent),
            Value::Null
        );
        assert_eq!(
            extract_metric(&empty, PerformanceMetric::DiskUsedPercent),
            Value::Null
        );
    }

    #[test]
    fn null_field_yields_null_not_panic() {
        // First-tick CPU is null until two samples have been taken.
        let snapshot = json!({ "cpuPercent": Value::Null });
        assert_eq!(
            extract_metric(&snapshot, PerformanceMetric::CpuPercent),
            Value::Null
        );
    }

    #[test]
    fn cron_every_day_at_0300() {
        // "0 3 * * *" — minute 0, hour 3, any day/month/weekday.
        assert!(cron_matches_fields("0 3 * * *", 0, 3, 15, 6, 4));
        assert!(!cron_matches_fields("0 3 * * *", 1, 3, 15, 6, 4)); // minute 1
        assert!(!cron_matches_fields("0 3 * * *", 0, 4, 15, 6, 4)); // hour 4
    }

    #[test]
    fn cron_step_and_range_and_list() {
        // every 15 minutes
        assert!(cron_matches_fields("*/15 * * * *", 30, 9, 1, 1, 1));
        assert!(!cron_matches_fields("*/15 * * * *", 31, 9, 1, 1, 1));
        // weekdays Mon-Fri (1-5) at 09:00
        assert!(cron_matches_fields("0 9 * * 1-5", 0, 9, 1, 1, 3)); // Wed
        assert!(!cron_matches_fields("0 9 * * 1-5", 0, 9, 1, 1, 0)); // Sun
        // comma list of hours
        assert!(cron_matches_fields("0 9,17 * * *", 0, 17, 1, 1, 2));
    }

    #[test]
    fn cron_weekday_seven_is_sunday() {
        // dow 0 (Sunday) matches a cron "7".
        assert!(cron_matches_fields("0 0 * * 7", 0, 0, 1, 1, 0));
        assert!(!cron_matches_fields("0 0 * * 7", 0, 0, 1, 1, 1));
    }

    #[test]
    fn cron_validation_rejects_bad_expressions() {
        assert!(validate_cron("0 3 * * *").is_ok());
        assert!(validate_cron("*/15 9-17 * * 1-5").is_ok());
        assert!(validate_cron("0 3 * *").is_err()); // 4 fields
        assert!(validate_cron("bad 3 * * *").is_err()); // non-numeric
        assert!(validate_cron("0 3 * * */0").is_err()); // zero step
    }

    #[test]
    fn log_file_fires_only_on_new_matching_content() {
        use std::io::Write;
        let path = std::env::temp_dir().join(format!(
            "kkterm-itops-log-{}-{}.log",
            std::process::id(),
            now_ms()
        ));
        let path_str = path.to_string_lossy().to_string();

        // Pre-existing content with the pattern: the first poll baselines and
        // does NOT fire on old lines.
        std::fs::write(&path, b"old line ERROR already here\n").unwrap();
        let (size1, matched1) = scan_log_appended(&path_str, None, "ERROR");
        assert!(!matched1);
        assert!(size1.is_some());

        // Append a non-matching line: no fire.
        let mut file = std::fs::OpenOptions::new().append(true).open(&path).unwrap();
        file.write_all(b"all good\n").unwrap();
        file.flush().unwrap();
        let (size2, matched2) = scan_log_appended(&path_str, size1, "ERROR");
        assert!(!matched2);

        // Append a matching line: fires once.
        file.write_all(b"boom ERROR happened\n").unwrap();
        file.flush().unwrap();
        let (size3, matched3) = scan_log_appended(&path_str, size2, "ERROR");
        assert!(matched3);

        // No new content: does not re-fire.
        let (_size4, matched4) = scan_log_appended(&path_str, size3, "ERROR");
        assert!(!matched4);

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn log_file_missing_does_not_fire() {
        let (size, matched) = scan_log_appended("/no/such/itops/log/file.log", Some(0), "X");
        assert!(!matched);
        assert_eq!(size, None);
    }
}
