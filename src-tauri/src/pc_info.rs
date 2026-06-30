//! PC Info — a Speccy-style system information snapshot for the Dashboard
//! "PC Info" built-in widget.
//!
//! Gathering strategy follows the product preference of "system command with a
//! hidden window, locale-aware". The primary Windows path runs a single hidden
//! PowerShell process that queries CIM/WMI classes and emits **structured JSON**
//! via `ConvertTo-Json`. CIM class *property names* are invariant English, so the
//! parse is immune to the localized label problem that text reports such as
//! `msinfo32 /report` or `systeminfo` suffer from. When CIM/WMI is unavailable
//! (the service is disabled or PowerShell is locked down) the Windows path
//! degrades to native Win32 + registry reads for the core OS/CPU/memory fields so
//! the widget still shows something useful.
//!
//! macOS uses `system_profiler -json` (also stable English keys); other Unix
//! targets read `/proc` best-effort. Every field is optional so a partial gather
//! is never an error.
//!
//! The snapshot is cached in memory. The widget loads the cache on first mount
//! and only re-gathers when the user clicks Refresh, so the (relatively
//! expensive) process spawn does not run on every render or view switch.

use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PcInfoSnapshot {
    /// Unix seconds the snapshot was gathered.
    pub generated_at_unix_seconds: u64,
    /// Which collection path produced this snapshot (for diagnostics/UI footer).
    pub source: String,
    /// Non-fatal collection notes (e.g. a fallback was used).
    pub warnings: Vec<String>,
    pub os: OsInfo,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub motherboard: MotherboardInfo,
    pub graphics: Vec<GpuInfo>,
    pub displays: Vec<DisplayInfo>,
    pub storage: Vec<DiskInfo>,
    pub volumes: Vec<VolumeInfo>,
    pub network: Vec<NetworkAdapterInfo>,
    pub audio: Vec<AudioDeviceInfo>,
    pub battery: Vec<BatteryInfo>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub name: Option<String>,
    pub version: Option<String>,
    pub build: Option<String>,
    pub architecture: Option<String>,
    pub hostname: Option<String>,
    pub registered_user: Option<String>,
    pub logged_in_user: Option<String>,
    pub locale: Option<String>,
    pub time_zone: Option<String>,
    pub product_id: Option<String>,
    pub system_drive: Option<String>,
    pub install_date_unix_seconds: Option<u64>,
    pub last_boot_unix_seconds: Option<u64>,
    pub uptime_seconds: Option<u64>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub name: Option<String>,
    pub vendor: Option<String>,
    pub family: Option<String>,
    pub physical_cores: Option<u32>,
    pub enabled_cores: Option<u32>,
    pub logical_processors: Option<u32>,
    pub max_clock_mhz: Option<u64>,
    pub current_clock_mhz: Option<u64>,
    pub l1_cache_bytes: Option<u64>,
    pub l2_cache_bytes: Option<u64>,
    pub l3_cache_bytes: Option<u64>,
    pub address_width_bits: Option<u32>,
    pub virtualization_enabled: Option<bool>,
    pub socket: Option<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_bytes: Option<u64>,
    pub available_bytes: Option<u64>,
    pub used_percent: Option<f64>,
    pub slots_used: Option<u32>,
    pub slots_total: Option<u32>,
    pub max_capacity_bytes: Option<u64>,
    pub modules: Vec<MemoryModuleInfo>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemoryModuleInfo {
    pub slot: Option<String>,
    pub bank: Option<String>,
    pub capacity_bytes: Option<u64>,
    pub speed_mhz: Option<u64>,
    pub voltage_millivolts: Option<u64>,
    pub manufacturer: Option<String>,
    pub part_number: Option<String>,
    pub form_factor: Option<String>,
    pub memory_type: Option<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MotherboardInfo {
    pub manufacturer: Option<String>,
    pub product: Option<String>,
    pub version: Option<String>,
    pub serial_number: Option<String>,
    pub bios_vendor: Option<String>,
    pub bios_version: Option<String>,
    pub bios_date: Option<String>,
    pub system_type: Option<String>,
    pub chassis_type: Option<String>,
    pub system_sku: Option<String>,
    pub system_uuid: Option<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub name: Option<String>,
    pub vendor: Option<String>,
    pub chip: Option<String>,
    pub vram_bytes: Option<u64>,
    pub driver_version: Option<String>,
    pub driver_date: Option<String>,
    pub current_mode: Option<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub name: Option<String>,
    pub manufacturer: Option<String>,
    pub resolution: Option<String>,
    pub refresh_hz: Option<u32>,
    pub size_inches: Option<f64>,
    pub year: Option<u32>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub model: Option<String>,
    pub size_bytes: Option<u64>,
    pub media_type: Option<String>,
    pub interface: Option<String>,
    pub serial_number: Option<String>,
    pub health_status: Option<String>,
    pub spindle_speed_rpm: Option<u32>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VolumeInfo {
    pub mount: Option<String>,
    pub label: Option<String>,
    pub file_system: Option<String>,
    pub total_bytes: Option<u64>,
    pub free_bytes: Option<u64>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAdapterInfo {
    pub name: Option<String>,
    pub mac_address: Option<String>,
    pub adapter_type: Option<String>,
    pub speed_bits_per_second: Option<u64>,
    pub connected: Option<bool>,
    pub dhcp_enabled: Option<bool>,
    pub dhcp_server: Option<String>,
    pub dns_suffix: Option<String>,
    pub ip_addresses: Vec<String>,
    pub subnet_masks: Vec<String>,
    pub gateways: Vec<String>,
    pub dns_servers: Vec<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AudioDeviceInfo {
    pub name: Option<String>,
    pub manufacturer: Option<String>,
}

#[derive(Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub name: Option<String>,
    pub charge_percent: Option<u32>,
    pub status: Option<String>,
    pub design_capacity_mwh: Option<u64>,
    pub full_charge_capacity_mwh: Option<u64>,
    pub wear_percent: Option<f64>,
}

/// In-memory cache for the PC Info snapshot. One per app; the machine does not
/// change between gathers, so a single cached value is sufficient.
#[derive(Default)]
pub struct PcInfoCache {
    snapshot: Mutex<Option<PcInfoSnapshot>>,
}

impl PcInfoCache {
    pub fn new() -> Self {
        Self::default()
    }

    /// Return the cached snapshot, gathering once if the cache is empty. Used for
    /// the widget's lazy first load.
    pub fn get_or_gather(&self) -> PcInfoSnapshot {
        if let Ok(guard) = self.snapshot.lock() {
            if let Some(existing) = guard.as_ref() {
                return existing.clone();
            }
        }
        self.refresh()
    }

    /// Force a fresh gather and replace the cache. Used by the Refresh button.
    pub fn refresh(&self) -> PcInfoSnapshot {
        let snapshot = gather_snapshot();
        if let Ok(mut guard) = self.snapshot.lock() {
            *guard = Some(snapshot.clone());
        }
        snapshot
    }
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn gather_snapshot() -> PcInfoSnapshot {
    let mut snapshot = platform::gather();
    snapshot.generated_at_unix_seconds = unix_seconds();
    snapshot
}

/// Trim a string, treat empty/whitespace as absent, and drop the placeholder
/// junk that vendors leave in SMBIOS fields ("To Be Filled By O.E.M.",
/// "Default string", "System manufacturer", …) so the UI shows nothing instead
/// of meaningless boilerplate.
fn clean(value: Option<String>) -> Option<String> {
    let text = value?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    const PLACEHOLDERS: [&str; 9] = [
        "to be filled by o.e.m.",
        "to be filled by oem",
        "default string",
        "system manufacturer",
        "system product name",
        "none",
        "n/a",
        "not specified",
        "not available",
    ];
    if PLACEHOLDERS.contains(&trimmed.to_ascii_lowercase().as_str()) {
        return None;
    }
    Some(trimmed.to_string())
}

// Cross-platform battery snapshot for the macOS/Linux paths (Windows reads
// batteries via CIM). Backed by the `starship-battery` crate, which wraps IOKit
// on macOS and sysfs on Linux. Any failure yields an empty list — a missing or
// unreadable battery is a normal, non-error outcome (e.g. desktops).
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn collect_batteries() -> Vec<BatteryInfo> {
    use battery::units::energy::watt_hour;
    use battery::units::ratio::percent;

    let Ok(manager) = battery::Manager::new() else {
        return Vec::new();
    };
    let Ok(batteries) = manager.batteries() else {
        return Vec::new();
    };

    let mut out = Vec::new();
    for entry in batteries {
        let Ok(battery) = entry else {
            continue;
        };
        let charge = battery.state_of_charge().get::<percent>();
        let full_wh = battery.energy_full().get::<watt_hour>() as f64;
        let design_wh = battery.energy_full_design().get::<watt_hour>() as f64;
        // Wear = how far the full-charge capacity has dropped below the factory
        // design capacity. Only report when both capacities are known and sane.
        let wear = if design_wh > 0.0 && full_wh > 0.0 && full_wh <= design_wh {
            Some(((1.0 - full_wh / design_wh) * 100.0 * 10.0).round() / 10.0)
        } else {
            None
        };
        out.push(BatteryInfo {
            name: clean(battery.model().map(|s| s.to_string()))
                .or_else(|| clean(battery.vendor().map(|s| s.to_string()))),
            charge_percent: Some(charge.round().clamp(0.0, 100.0) as u32),
            status: Some(battery_state_label(battery.state())),
            design_capacity_mwh: (design_wh > 0.0).then(|| (design_wh * 1000.0).round() as u64),
            full_charge_capacity_mwh: (full_wh > 0.0).then(|| (full_wh * 1000.0).round() as u64),
            wear_percent: wear,
        });
    }
    out
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn battery_state_label(state: battery::State) -> String {
    use battery::State;
    match state {
        State::Charging => "Charging",
        State::Discharging => "Discharging",
        State::Empty => "Empty",
        State::Full => "Fully charged",
        _ => "Unknown",
    }
    .to_string()
}

#[cfg(target_os = "windows")]
mod platform {
    use super::*;
    use serde_json::Value;
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // One hidden PowerShell pass that returns every section as structured JSON.
    // CIM property names are invariant English, so values like Caption/Model are
    // stable regardless of the Windows display language.
    const QUERY: &str = r#"$ErrorActionPreference='SilentlyContinue';
function E($d){ if($d){[int64]([math]::Floor((($d).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds))} else {$null} }
function S($a){ if($a){ (($a | Where-Object {$_ -gt 0} | ForEach-Object {[char]$_}) -join '').Trim() } else {$null} }
$os=Get-CimInstance Win32_OperatingSystem;
$cs=Get-CimInstance Win32_ComputerSystem;
$out=[ordered]@{
 os=$os | Select-Object Caption,Version,BuildNumber,OSArchitecture,CSName,RegisteredUser,Locale,SerialNumber,SystemDrive,@{n='InstallDateEpoch';e={E $_.InstallDate}},@{n='LastBootEpoch';e={E $_.LastBootUpTime}};
 tz=(Get-CimInstance Win32_TimeZone | Select-Object -First 1).Caption;
 cs=$cs | Select-Object Manufacturer,Model,SystemType,TotalPhysicalMemory,UserName,NumberOfLogicalProcessors,PCSystemType,SystemSKUNumber;
 csp=Get-CimInstance Win32_ComputerSystemProduct | Select-Object UUID,IdentifyingNumber;
 chassis=@(Get-CimInstance Win32_SystemEnclosure | Select-Object -ExpandProperty ChassisTypes);
 cpu=@(Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,Description,NumberOfCores,NumberOfEnabledCore,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed,L2CacheSize,L3CacheSize,AddressWidth,SocketDesignation,VirtualizationFirmwareEnabled);
 l1=@(Get-CimInstance Win32_CacheMemory -Filter 'Level=3' | Select-Object InstalledSize);
 mem=@(Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity,Speed,ConfiguredClockSpeed,Manufacturer,PartNumber,DeviceLocator,BankLabel,FormFactor,SMBIOSMemoryType,ConfiguredVoltage);
 memarray=Get-CimInstance Win32_PhysicalMemoryArray | Select-Object -First 1 MemoryDevices,MaxCapacityEx;
 board=Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,Version,SerialNumber;
 bios=Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,@{n='ReleaseEpoch';e={E $_.ReleaseDate}};
 gpu=@(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,AdapterCompatibility,DriverVersion,VideoProcessor,@{n='DriverEpoch';e={E $_.DriverDate}},CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate);
 gpumem=@(Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue | ForEach-Object { $p=Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if($p.'HardwareInformation.qwMemorySize'){[ordered]@{name=$p.DriverDesc;bytes=[int64]$p.'HardwareInformation.qwMemorySize'}} });
 disk=@(Get-CimInstance Win32_DiskDrive | Select-Object Model,Size,InterfaceType,MediaType,SerialNumber);
 phys=@(Get-CimInstance -Namespace root/Microsoft/Windows/Storage -ClassName MSFT_PhysicalDisk -ErrorAction SilentlyContinue | Select-Object FriendlyName,Size,MediaType,BusType,SerialNumber,HealthStatus,SpindleSpeed);
 vol=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,FileSystem,Size,FreeSpace,VolumeName);
 audio=@(Get-CimInstance Win32_SoundDevice | Select-Object Name,Manufacturer);
 net=@(Get-CimInstance Win32_NetworkAdapter -Filter 'PhysicalAdapter=TRUE' | Select-Object Name,MACAddress,AdapterType,Speed,NetConnectionStatus,InterfaceIndex);
 netcfg=@(Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=TRUE' | Select-Object Description,MACAddress,IPAddress,IPSubnet,DefaultIPGateway,DNSServerSearchOrder,DNSDomain,DHCPEnabled,DHCPServer,InterfaceIndex);
 battery=@(Get-CimInstance Win32_Battery | Select-Object Name,EstimatedChargeRemaining,BatteryStatus);
 battdesign=@(Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object DesignedCapacity);
 battfull=@(Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object FullChargedCapacity);
 monid=@(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorID -ErrorAction SilentlyContinue | ForEach-Object { [ordered]@{ name=(S $_.UserFriendlyName); manufacturer=(S $_.ManufacturerName); year=$_.YearOfManufacture } });
 monsz=@(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue | Select-Object MaxHorizontalImageSize,MaxVerticalImageSize)
};
$out | ConvertTo-Json -Depth 5 -Compress"#;

    pub fn gather() -> PcInfoSnapshot {
        match run_powershell() {
            Some(json) => from_cim(json),
            None => fallback(),
        }
    }

    fn run_powershell() -> Option<Value> {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                QUERY,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str::<Value>(text.trim()).ok()
    }

    fn from_cim(root: Value) -> PcInfoSnapshot {
        let mut snapshot = PcInfoSnapshot {
            source: "windows-cim".to_string(),
            ..Default::default()
        };

        let os = root.get("os").cloned().unwrap_or(Value::Null);
        let cs = root.get("cs").cloned().unwrap_or(Value::Null);
        let csp = root.get("csp").cloned().unwrap_or(Value::Null);
        let last_boot = j_u64(&os, "LastBootEpoch");
        snapshot.os = OsInfo {
            name: clean(j_str(&os, "Caption")),
            version: clean(j_str(&os, "Version")),
            build: clean(j_str(&os, "BuildNumber")),
            architecture: clean(j_str(&os, "OSArchitecture")),
            hostname: clean(j_str(&os, "CSName")),
            registered_user: clean(j_str(&os, "RegisteredUser")),
            logged_in_user: clean(j_str(&cs, "UserName")),
            locale: clean(j_str(&os, "Locale")),
            time_zone: clean(j_str(&root, "tz")),
            product_id: clean(j_str(&os, "SerialNumber")),
            system_drive: clean(j_str(&os, "SystemDrive")),
            install_date_unix_seconds: j_u64(&os, "InstallDateEpoch"),
            last_boot_unix_seconds: last_boot,
            uptime_seconds: last_boot.map(|boot| unix_seconds().saturating_sub(boot)),
        };

        // CPU: Win32_Processor is an array of sockets; the first describes the
        // package and logical/physical counts are summed across sockets.
        let cpus = j_array(&root, "cpu");
        if let Some(first) = cpus.first() {
            let physical: u32 = cpus.iter().filter_map(|c| j_u64(c, "NumberOfCores")).sum::<u64>() as u32;
            let enabled: u32 = cpus
                .iter()
                .filter_map(|c| j_u64(c, "NumberOfEnabledCore"))
                .sum::<u64>() as u32;
            let logical: u32 = cpus
                .iter()
                .filter_map(|c| j_u64(c, "NumberOfLogicalProcessors"))
                .sum::<u64>() as u32;
            // L1 is not on Win32_Processor; sum InstalledSize (KB) of the
            // Level=3 (primary) Win32_CacheMemory rows.
            let l1_kb: u64 = j_array(&root, "l1")
                .iter()
                .filter_map(|c| j_u64(c, "InstalledSize"))
                .sum();
            snapshot.cpu = CpuInfo {
                name: clean(j_str(first, "Name")),
                vendor: clean(j_str(first, "Manufacturer")),
                family: clean(j_str(first, "Description")),
                physical_cores: (physical > 0).then_some(physical),
                enabled_cores: (enabled > 0).then_some(enabled),
                logical_processors: (logical > 0)
                    .then_some(logical)
                    .or_else(|| j_u64(&cs, "NumberOfLogicalProcessors").map(|v| v as u32)),
                max_clock_mhz: j_u64(first, "MaxClockSpeed"),
                current_clock_mhz: j_u64(first, "CurrentClockSpeed"),
                l1_cache_bytes: (l1_kb > 0).then_some(l1_kb * 1024),
                l2_cache_bytes: j_u64(first, "L2CacheSize").map(|kb| kb * 1024),
                l3_cache_bytes: j_u64(first, "L3CacheSize").map(|kb| kb * 1024),
                address_width_bits: j_u64(first, "AddressWidth").map(|v| v as u32),
                virtualization_enabled: first.get("VirtualizationFirmwareEnabled").and_then(Value::as_bool),
                socket: clean(j_str(first, "SocketDesignation")),
            };
        }

        let total_phys = j_u64(&cs, "TotalPhysicalMemory");
        let memarray = root.get("memarray").cloned().unwrap_or(Value::Null);
        let modules: Vec<MemoryModuleInfo> = j_array(&root, "mem")
            .iter()
            .map(|m| MemoryModuleInfo {
                slot: clean(j_str(m, "DeviceLocator")),
                bank: clean(j_str(m, "BankLabel")),
                capacity_bytes: j_u64(m, "Capacity"),
                speed_mhz: j_u64(m, "ConfiguredClockSpeed").or_else(|| j_u64(m, "Speed")),
                voltage_millivolts: j_u64(m, "ConfiguredVoltage").filter(|&mv| mv > 0),
                manufacturer: clean(j_str(m, "Manufacturer")),
                part_number: clean(j_str(m, "PartNumber")),
                form_factor: memory_form_factor(j_u64(m, "FormFactor")),
                memory_type: smbios_memory_type(j_u64(m, "SMBIOSMemoryType")),
            })
            .collect();
        let slots_used = u32::try_from(modules.len()).ok().filter(|&n| n > 0);
        snapshot.memory = MemoryInfo {
            total_bytes: total_phys,
            available_bytes: None,
            used_percent: None,
            slots_used,
            slots_total: j_u64(&memarray, "MemoryDevices").map(|v| v as u32),
            // MaxCapacityEx is reported in KB.
            max_capacity_bytes: j_u64(&memarray, "MaxCapacityEx").map(|kb| kb * 1024),
            modules,
        };
        // Fill available/used from the live Win32 counter so the RAM section has
        // headroom data even though CIM omits it here.
        if let Some((avail, used_percent)) = win32_memory_available() {
            snapshot.memory.available_bytes = Some(avail);
            snapshot.memory.used_percent = Some(used_percent);
        }

        let board = root.get("board").cloned().unwrap_or(Value::Null);
        let bios = root.get("bios").cloned().unwrap_or(Value::Null);
        snapshot.motherboard = MotherboardInfo {
            manufacturer: clean(j_str(&board, "Manufacturer")),
            product: clean(j_str(&board, "Product")),
            version: clean(j_str(&board, "Version")),
            serial_number: clean(j_str(&board, "SerialNumber")),
            bios_vendor: clean(j_str(&bios, "Manufacturer")),
            bios_version: clean(j_str(&bios, "SMBIOSBIOSVersion")),
            bios_date: j_u64(&bios, "ReleaseEpoch").map(format_epoch_date),
            system_type: pc_system_type(j_u64(&cs, "PCSystemType")),
            chassis_type: chassis_type(j_array(&root, "chassis").first().and_then(Value::as_u64)),
            system_sku: clean(j_str(&cs, "SystemSKUNumber")),
            system_uuid: clean(j_str(&csp, "UUID")),
        };

        // True VRAM comes from the display-adapter class registry key
        // (`HardwareInformation.qwMemorySize`, a 64-bit value). `AdapterRAM` from
        // Win32_VideoController is a signed 32-bit field that saturates at ~4 GB,
        // so a 16 GB card would otherwise report 4 GB. Match by adapter name.
        let vram_by_name: Vec<(String, u64)> = j_array(&root, "gpumem")
            .iter()
            .filter_map(|m| Some((j_str(m, "name")?, j_u64(m, "bytes")?)))
            .collect();

        for g in j_array(&root, "gpu") {
            let width = j_u64(&g, "CurrentHorizontalResolution");
            let height = j_u64(&g, "CurrentVerticalResolution");
            let refresh = j_u64(&g, "CurrentRefreshRate");
            let current_mode = match (width, height) {
                (Some(w), Some(h)) => Some(match refresh {
                    Some(r) => format!("{w} × {h} @ {r} Hz"),
                    None => format!("{w} × {h}"),
                }),
                _ => None,
            };
            let name = clean(j_str(&g, "Name"));
            // Prefer the accurate 64-bit registry value; fall back to the capped
            // AdapterRAM only when no registry match is found.
            let vram = name
                .as_ref()
                .and_then(|n| {
                    vram_by_name
                        .iter()
                        .find(|(reg_name, _)| reg_name == n)
                        .map(|(_, bytes)| *bytes)
                })
                .or_else(|| j_u64(&g, "AdapterRAM").filter(|&bytes| bytes > 0));
            snapshot.graphics.push(GpuInfo {
                name: name.clone(),
                vendor: clean(j_str(&g, "AdapterCompatibility")),
                chip: clean(j_str(&g, "VideoProcessor")),
                vram_bytes: vram,
                driver_version: clean(j_str(&g, "DriverVersion")),
                driver_date: j_u64(&g, "DriverEpoch").map(format_epoch_date),
                current_mode: current_mode.clone(),
            });
        }

        // Real monitor identity (make/model/year + physical size) comes from the
        // EDID-backed root\wmi classes; pair WmiMonitorID with the size class by
        // index. Attach the active resolution from the GPU list when counts line
        // up. Fall back to GPU-derived resolution rows when no EDID is exposed.
        let monitor_ids = j_array(&root, "monid");
        let monitor_sizes = j_array(&root, "monsz");
        if monitor_ids.is_empty() {
            for g in j_array(&root, "gpu") {
                let width = j_u64(&g, "CurrentHorizontalResolution");
                let height = j_u64(&g, "CurrentVerticalResolution");
                if let (Some(w), Some(h)) = (width, height) {
                    snapshot.displays.push(DisplayInfo {
                        name: clean(j_str(&g, "Name")),
                        resolution: Some(format!("{w} × {h}")),
                        refresh_hz: j_u64(&g, "CurrentRefreshRate").map(|r| r as u32),
                        ..Default::default()
                    });
                }
            }
        } else {
            for (index, mon) in monitor_ids.iter().enumerate() {
                let size = monitor_sizes.get(index).and_then(|s| {
                    let cm_h = j_u64(s, "MaxHorizontalImageSize")? as f64;
                    let cm_v = j_u64(s, "MaxVerticalImageSize")? as f64;
                    if cm_h <= 0.0 || cm_v <= 0.0 {
                        return None;
                    }
                    // Diagonal in cm → inches, one decimal.
                    let inches = (cm_h * cm_h + cm_v * cm_v).sqrt() / 2.54;
                    Some((inches * 10.0).round() / 10.0)
                });
                snapshot.displays.push(DisplayInfo {
                    name: clean(j_str(mon, "name")),
                    manufacturer: clean(j_str(mon, "manufacturer")),
                    resolution: None,
                    refresh_hz: None,
                    size_inches: size,
                    year: j_u64(mon, "year").filter(|&y| y > 1990).map(|y| y as u32),
                });
            }
        }

        // Prefer MSFT_PhysicalDisk (Storage namespace): it reports real SSD/HDD
        // media and the bus type (NVMe / SATA / USB …) as stable numeric codes.
        // Fall back to Win32_DiskDrive whose MediaType is just "Fixed hard disk".
        let phys = j_array(&root, "phys");
        snapshot.storage = if !phys.is_empty() {
            phys.iter()
                .map(|d| DiskInfo {
                    model: clean(j_str(d, "FriendlyName")),
                    size_bytes: j_u64(d, "Size"),
                    media_type: physical_media_type(j_u64(d, "MediaType")),
                    interface: physical_bus_type(j_u64(d, "BusType")),
                    serial_number: clean(j_str(d, "SerialNumber")),
                    health_status: disk_health(j_u64(d, "HealthStatus")),
                    // 0 / 0xFFFFFFFF means SSD or unknown — only report real RPM.
                    spindle_speed_rpm: j_u64(d, "SpindleSpeed")
                        .filter(|&rpm| rpm > 0 && rpm < 0xFFFF_FFFF)
                        .map(|rpm| rpm as u32),
                })
                .collect()
        } else {
            j_array(&root, "disk")
                .iter()
                .map(|d| DiskInfo {
                    model: clean(j_str(d, "Model")),
                    size_bytes: j_u64(d, "Size"),
                    media_type: clean(j_str(d, "MediaType")),
                    interface: clean(j_str(d, "InterfaceType")),
                    serial_number: clean(j_str(d, "SerialNumber")),
                    health_status: None,
                    spindle_speed_rpm: None,
                })
                .collect()
        };

        snapshot.volumes = j_array(&root, "vol")
            .iter()
            .map(|v| VolumeInfo {
                mount: clean(j_str(v, "DeviceID")),
                label: clean(j_str(v, "VolumeName")),
                file_system: clean(j_str(v, "FileSystem")),
                total_bytes: j_u64(v, "Size"),
                free_bytes: j_u64(v, "FreeSpace"),
            })
            .collect();

        snapshot.audio = j_array(&root, "audio")
            .iter()
            .map(|a| AudioDeviceInfo {
                name: clean(j_str(a, "Name")),
                manufacturer: clean(j_str(a, "Manufacturer")),
            })
            .collect();

        snapshot.network = build_network(&root);
        snapshot.battery = build_battery(&root);

        snapshot
    }

    fn build_battery(root: &Value) -> Vec<BatteryInfo> {
        let designs = j_array(root, "battdesign");
        let fulls = j_array(root, "battfull");
        j_array(root, "battery")
            .iter()
            .enumerate()
            .map(|(index, b)| {
                let design = designs.get(index).and_then(|d| j_u64(d, "DesignedCapacity"));
                let full = fulls.get(index).and_then(|f| j_u64(f, "FullChargedCapacity"));
                // Wear = how much the full-charge capacity has dropped below the
                // factory design capacity.
                let wear = match (design, full) {
                    (Some(d), Some(f)) if d > 0 && f <= d => {
                        Some((1.0 - f as f64 / d as f64) * 100.0)
                    }
                    _ => None,
                };
                BatteryInfo {
                    name: clean(j_str(b, "Name")),
                    charge_percent: j_u64(b, "EstimatedChargeRemaining").map(|v| v as u32),
                    status: battery_status(j_u64(b, "BatteryStatus")),
                    design_capacity_mwh: design,
                    full_charge_capacity_mwh: full,
                    wear_percent: wear.map(|w| (w * 10.0).round() / 10.0),
                }
            })
            .collect()
    }

    fn build_network(root: &Value) -> Vec<NetworkAdapterInfo> {
        let adapters = j_array(root, "net");
        let configs = j_array(root, "netcfg");
        // Index configs by InterfaceIndex so IP/gateway/DNS attach to the right
        // adapter; fall back to listing config-only entries when no adapter row
        // matches.
        configs
            .iter()
            .map(|cfg| {
                let index = j_u64(cfg, "InterfaceIndex");
                let adapter = adapters
                    .iter()
                    .find(|a| j_u64(a, "InterfaceIndex") == index && index.is_some());
                NetworkAdapterInfo {
                    name: adapter
                        .and_then(|a| clean(j_str(a, "Name")))
                        .or_else(|| clean(j_str(cfg, "Description"))),
                    mac_address: clean(j_str(cfg, "MACAddress"))
                        .or_else(|| adapter.and_then(|a| clean(j_str(a, "MACAddress")))),
                    adapter_type: adapter.and_then(|a| clean(j_str(a, "AdapterType"))),
                    speed_bits_per_second: adapter.and_then(|a| j_u64(a, "Speed")),
                    // NetConnectionStatus == 2 means "Connected".
                    connected: adapter.and_then(|a| j_u64(a, "NetConnectionStatus")).map(|s| s == 2),
                    dhcp_enabled: cfg.get("DHCPEnabled").and_then(Value::as_bool),
                    dhcp_server: clean(j_str(cfg, "DHCPServer")),
                    dns_suffix: clean(j_str(cfg, "DNSDomain")),
                    ip_addresses: j_str_array(cfg, "IPAddress"),
                    subnet_masks: j_str_array(cfg, "IPSubnet"),
                    gateways: j_str_array(cfg, "DefaultIPGateway"),
                    dns_servers: j_str_array(cfg, "DNSServerSearchOrder"),
                }
            })
            .collect()
    }

    // ── JSON extraction helpers ───────────────────────────────────────────────

    fn j_str(value: &Value, key: &str) -> Option<String> {
        value.get(key).and_then(|v| match v {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
    }

    fn j_u64(value: &Value, key: &str) -> Option<u64> {
        value.get(key).and_then(|v| match v {
            Value::Number(n) => n
                .as_u64()
                .or_else(|| n.as_i64().filter(|&i| i >= 0).map(|i| i as u64))
                .or_else(|| n.as_f64().filter(|f| f.is_finite() && *f >= 0.0).map(|f| f as u64)),
            Value::String(s) => s.trim().parse::<u64>().ok(),
            _ => None,
        })
    }

    fn j_array(value: &Value, key: &str) -> Vec<Value> {
        match value.get(key) {
            Some(Value::Array(items)) => items.clone(),
            Some(Value::Null) | None => Vec::new(),
            Some(other) => vec![other.clone()],
        }
    }

    fn j_str_array(value: &Value, key: &str) -> Vec<String> {
        match value.get(key) {
            Some(Value::Array(items)) => items
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .filter(|s| !s.trim().is_empty())
                .collect(),
            Some(Value::String(s)) if !s.trim().is_empty() => vec![s.clone()],
            _ => Vec::new(),
        }
    }

    fn pc_system_type(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                1 => "Desktop",
                2 => "Laptop",
                3 => "Workstation",
                4 | 5 | 7 => "Server",
                6 => "Appliance",
                8 => "Slate",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn chassis_type(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                3 | 4 | 6 | 7 => "Desktop",
                5 => "Pizza Box",
                8 | 9 | 10 | 14 => "Laptop",
                11 => "Handheld",
                12 | 13 => "Docking Station",
                15 | 16 => "Desktop",
                17 | 23 => "Rack Server",
                18 | 19 => "Sub Chassis",
                30 | 31 | 32 => "Tablet",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn disk_health(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                0 => "Healthy",
                1 => "Warning",
                2 => "Unhealthy",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn battery_status(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                1 => "Discharging",
                2 => "On AC",
                3 => "Fully charged",
                4 => "Low",
                5 => "Critical",
                6 | 7 | 8 => "Charging",
                9 => "Undefined",
                10 => "Partially charged",
                11 => "On AC",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn physical_media_type(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                3 => "HDD",
                4 => "SSD",
                5 => "SCM",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn physical_bus_type(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                1 => "SCSI",
                3 => "ATA",
                4 => "IEEE 1394",
                7 => "USB",
                8 => "RAID",
                9 => "iSCSI",
                10 => "SAS",
                11 => "SATA",
                12 => "SD",
                13 => "MMC",
                17 => "NVMe",
                18 => "SCM",
                19 => "UFS",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn memory_form_factor(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                8 => "DIMM",
                12 => "SODIMM",
                13 => "SRIMM",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn smbios_memory_type(code: Option<u64>) -> Option<String> {
        Some(
            match code? {
                20 => "DDR",
                21 => "DDR2",
                24 => "DDR3",
                26 => "DDR4",
                34 => "DDR5",
                _ => return None,
            }
            .to_string(),
        )
    }

    fn format_epoch_date(epoch: u64) -> String {
        // Lightweight YYYY-MM-DD without pulling chrono; BIOS dates only need day
        // resolution.
        let days = (epoch / 86_400) as i64;
        let (year, month, day) = civil_from_days(days);
        format!("{year:04}-{month:02}-{day:02}")
    }

    fn win32_memory_available() -> Option<(u64, f64)> {
        use std::mem::{size_of, zeroed};
        use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
        unsafe {
            let mut status: MEMORYSTATUSEX = zeroed();
            status.dwLength = size_of::<MEMORYSTATUSEX>() as u32;
            if GlobalMemoryStatusEx(&mut status) != 0 {
                Some((status.ullAvailPhys, status.dwMemoryLoad as f64))
            } else {
                None
            }
        }
    }

    // ── Native fallback (WMI/PowerShell unavailable) ──────────────────────────

    fn fallback() -> PcInfoSnapshot {
        let mut snapshot = PcInfoSnapshot {
            source: "windows-win32-fallback".to_string(),
            warnings: vec![
                "WMI/PowerShell query failed; showing core fields from native Windows APIs."
                    .to_string(),
            ],
            ..Default::default()
        };

        snapshot.os = OsInfo {
            name: clean(reg_string(
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "ProductName",
            )),
            version: clean(reg_string(
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "DisplayVersion",
            )),
            build: clean(reg_string(
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "CurrentBuildNumber",
            )),
            architecture: Some(if cfg!(target_pointer_width = "64") {
                "64-bit".to_string()
            } else {
                "32-bit".to_string()
            }),
            hostname: std::env::var("COMPUTERNAME").ok(),
            registered_user: clean(reg_string(
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "RegisteredOwner",
            )),
            logged_in_user: std::env::var("USERNAME").ok(),
            locale: None,
            uptime_seconds: win32_uptime_seconds(),
            ..Default::default()
        };

        snapshot.cpu = CpuInfo {
            name: clean(reg_string(
                "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
                "ProcessorNameString",
            )),
            vendor: clean(reg_string(
                "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
                "VendorIdentifier",
            )),
            logical_processors: std::thread::available_parallelism()
                .ok()
                .map(|c| c.get() as u32),
            address_width_bits: Some(if cfg!(target_pointer_width = "64") { 64 } else { 32 }),
            ..Default::default()
        };

        if let Some((total, avail, used)) = win32_memory_full() {
            snapshot.memory = MemoryInfo {
                total_bytes: Some(total),
                available_bytes: Some(avail),
                used_percent: Some(used),
                ..Default::default()
            };
        }

        snapshot
    }

    fn win32_memory_full() -> Option<(u64, u64, f64)> {
        use std::mem::{size_of, zeroed};
        use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
        unsafe {
            let mut status: MEMORYSTATUSEX = zeroed();
            status.dwLength = size_of::<MEMORYSTATUSEX>() as u32;
            if GlobalMemoryStatusEx(&mut status) != 0 {
                Some((status.ullTotalPhys, status.ullAvailPhys, status.dwMemoryLoad as f64))
            } else {
                None
            }
        }
    }

    fn win32_uptime_seconds() -> Option<u64> {
        use windows_sys::Win32::System::SystemInformation::GetTickCount64;
        Some(unsafe { GetTickCount64() } / 1_000)
    }

    fn reg_string(subkey: &str, value_name: &str) -> Option<String> {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::System::Registry::{
            RegGetValueW, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ,
        };

        fn wide(text: &str) -> Vec<u16> {
            std::ffi::OsStr::new(text)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect()
        }

        let subkey_w = wide(subkey);
        let value_w = wide(value_name);
        let mut size: u32 = 0;
        unsafe {
            // First call sizes the buffer.
            if RegGetValueW(
                HKEY_LOCAL_MACHINE,
                subkey_w.as_ptr(),
                value_w.as_ptr(),
                RRF_RT_REG_SZ,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut size,
            ) != 0
                || size == 0
            {
                return None;
            }
            let mut buffer = vec![0u16; (size as usize / 2) + 1];
            let mut actual = size;
            if RegGetValueW(
                HKEY_LOCAL_MACHINE,
                subkey_w.as_ptr(),
                value_w.as_ptr(),
                RRF_RT_REG_SZ,
                std::ptr::null_mut(),
                buffer.as_mut_ptr().cast(),
                &mut actual,
            ) != 0
            {
                return None;
            }
            let len = buffer.iter().position(|&c| c == 0).unwrap_or(buffer.len());
            Some(String::from_utf16_lossy(&buffer[..len]))
        }
    }
}

// Shared civil-date conversion (Howard Hinnant's algorithm) used by date
// formatting on platforms that emit epoch seconds.
#[allow(dead_code)]
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(target_os = "macos")]
mod platform {
    use super::*;
    use serde_json::Value;
    use std::process::Command;

    pub fn gather() -> PcInfoSnapshot {
        let mut snapshot = match run_system_profiler() {
            Some(json) => from_system_profiler(json),
            None => PcInfoSnapshot {
                source: "macos-unavailable".to_string(),
                warnings: vec!["system_profiler returned no data.".to_string()],
                ..Default::default()
            },
        };
        fill_from_sysinfo(&mut snapshot);
        snapshot
    }

    fn run_system_profiler() -> Option<Value> {
        let output = Command::new("system_profiler")
            .args([
                "-json",
                "SPSoftwareDataType",
                "SPHardwareDataType",
                "SPDisplaysDataType",
                "SPStorageDataType",
                "SPMemoryDataType",
                "SPAudioDataType",
                "SPNetworkDataType",
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        serde_json::from_slice::<Value>(&output.stdout).ok()
    }

    fn first<'a>(root: &'a Value, key: &str) -> Option<&'a Value> {
        root.get(key).and_then(|v| v.as_array()).and_then(|a| a.first())
    }

    fn s(value: &Value, key: &str) -> Option<String> {
        clean(value.get(key).and_then(|v| v.as_str()).map(|s| s.to_string()))
    }

    fn from_system_profiler(root: Value) -> PcInfoSnapshot {
        let mut snapshot = PcInfoSnapshot {
            source: "macos-system_profiler".to_string(),
            ..Default::default()
        };

        if let Some(sw) = first(&root, "SPSoftwareDataType") {
            snapshot.os.name = s(sw, "os_version");
            snapshot.os.hostname = s(sw, "local_host_name");
            snapshot.os.logged_in_user = s(sw, "user_name");
            snapshot.os.version = s(sw, "kernel_version");
        }
        if let Some(hw) = first(&root, "SPHardwareDataType") {
            snapshot.cpu.name = s(hw, "chip_type").or_else(|| s(hw, "cpu_type"));
            snapshot.motherboard.product = s(hw, "machine_model").or_else(|| s(hw, "machine_name"));
            snapshot.motherboard.serial_number = s(hw, "serial_number");
            snapshot.motherboard.bios_version = s(hw, "boot_rom_version");
            if let Some(cores) = hw.get("number_processors").and_then(|v| v.as_str()) {
                // Either a plain count ("10") or Apple's "proc 10:6:4" total:perf:eff
                // shape; take the first integer as the logical core count.
                snapshot.cpu.logical_processors = cores
                    .split_whitespace()
                    .last()
                    .and_then(|token| token.split(':').next())
                    .and_then(|n| n.parse().ok());
            }
        }

        for gpu in root
            .get("SPDisplaysDataType")
            .and_then(|v| v.as_array())
            .map(|a| a.as_slice())
            .unwrap_or(&[])
        {
            snapshot.graphics.push(GpuInfo {
                name: s(gpu, "sppci_model"),
                vendor: s(gpu, "spdisplays_vendor"),
                ..Default::default()
            });
            for display in gpu
                .get("spdisplays_ndrvs")
                .and_then(|v| v.as_array())
                .map(|a| a.as_slice())
                .unwrap_or(&[])
            {
                snapshot.displays.push(DisplayInfo {
                    name: s(display, "_name"),
                    resolution: s(display, "_spdisplays_resolution")
                        .or_else(|| s(display, "spdisplays_resolution")),
                    ..Default::default()
                });
            }
        }

        for vol in root
            .get("SPStorageDataType")
            .and_then(|v| v.as_array())
            .map(|a| a.as_slice())
            .unwrap_or(&[])
        {
            snapshot.volumes.push(VolumeInfo {
                mount: s(vol, "mount_point"),
                label: s(vol, "_name"),
                file_system: s(vol, "file_system"),
                total_bytes: vol.get("size_in_bytes").and_then(|v| v.as_u64()),
                free_bytes: vol.get("free_space_in_bytes").and_then(|v| v.as_u64()),
            });
        }

        for dimm in root
            .get("SPMemoryDataType")
            .and_then(|v| v.as_array())
            .map(|a| a.as_slice())
            .unwrap_or(&[])
        {
            // Apple Silicon reports a single memory blob; Intel Macs list DIMMs
            // under "_items".
            if let Some(items) = dimm.get("_items").and_then(|v| v.as_array()) {
                for item in items {
                    snapshot.memory.modules.push(MemoryModuleInfo {
                        slot: s(item, "_name"),
                        manufacturer: s(item, "dimm_manufacturer"),
                        part_number: s(item, "dimm_part_number"),
                        memory_type: s(item, "dimm_type"),
                        ..Default::default()
                    });
                }
            }
        }

        for audio in root
            .get("SPAudioDataType")
            .and_then(|v| v.as_array())
            .map(|a| a.as_slice())
            .unwrap_or(&[])
        {
            snapshot.audio.push(AudioDeviceInfo {
                name: s(audio, "_name"),
                manufacturer: None,
            });
        }

        for net in root
            .get("SPNetworkDataType")
            .and_then(|v| v.as_array())
            .map(|a| a.as_slice())
            .unwrap_or(&[])
        {
            let ips = net
                .get("IPv4")
                .and_then(|v| v.get("Addresses"))
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            snapshot.network.push(NetworkAdapterInfo {
                name: s(net, "_name"),
                mac_address: s(net, "spnetwork_macaddress"),
                adapter_type: s(net, "hardware"),
                ip_addresses: ips,
                ..Default::default()
            });
        }

        snapshot
    }

    // `system_profiler` gives stable English keys but is sparse on CPU detail and
    // omits live memory; `sysinfo` (already used for Status Bar monitoring) fills
    // the gaps without a second OS-command parse. Only fields left empty by
    // system_profiler are touched, so the richer JSON source always wins.
    fn fill_from_sysinfo(snapshot: &mut PcInfoSnapshot) {
        use sysinfo::System;
        let mut system = System::new();
        system.refresh_memory();
        system.refresh_cpu_all();
        let total = system.total_memory();
        if total > 0 {
            snapshot.memory.total_bytes = Some(total);
            snapshot.memory.available_bytes = Some(system.available_memory());
            snapshot.memory.used_percent =
                Some(system.used_memory() as f64 / total as f64 * 100.0);
        }
        if let Some(cpu) = system.cpus().first() {
            if snapshot.cpu.name.is_none() {
                snapshot.cpu.name = clean(Some(cpu.brand().to_string()))
                    .or_else(|| clean(Some(cpu.name().to_string())));
            }
            if snapshot.cpu.vendor.is_none() {
                snapshot.cpu.vendor = clean(Some(cpu.vendor_id().to_string()));
            }
            let mhz = cpu.frequency();
            if mhz > 0 && snapshot.cpu.max_clock_mhz.is_none() {
                snapshot.cpu.max_clock_mhz = Some(mhz);
            }
        }
        if snapshot.cpu.physical_cores.is_none() {
            snapshot.cpu.physical_cores = System::physical_core_count()
                .and_then(|count| u32::try_from(count).ok())
                .filter(|&count| count > 0);
        }
        if snapshot.cpu.logical_processors.is_none() {
            snapshot.cpu.logical_processors = std::thread::available_parallelism()
                .ok()
                .map(|c| c.get() as u32);
        }
        snapshot.os.uptime_seconds = Some(System::uptime());
        if snapshot.os.name.is_none() {
            snapshot.os.name = System::long_os_version();
        }
        if snapshot.battery.is_empty() {
            snapshot.battery = collect_batteries();
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod platform {
    use super::*;
    use std::fs;

    pub fn gather() -> PcInfoSnapshot {
        let mut snapshot = PcInfoSnapshot {
            source: "linux-proc".to_string(),
            ..Default::default()
        };

        snapshot.os = OsInfo {
            name: os_release_pretty_name(),
            version: read_trimmed("/proc/sys/kernel/osrelease"),
            build: None,
            architecture: Some(std::env::consts::ARCH.to_string()),
            hostname: read_trimmed("/proc/sys/kernel/hostname")
                .or_else(|| std::env::var("HOSTNAME").ok()),
            registered_user: None,
            logged_in_user: std::env::var("USER").ok(),
            locale: std::env::var("LANG").ok(),
            uptime_seconds: read_uptime_seconds(),
            ..Default::default()
        };

        snapshot.cpu = cpu_from_proc();
        snapshot.memory = memory_from_proc();
        snapshot.storage = storage_from_sysfs();
        snapshot.graphics = gpus_from_lspci();
        enrich_from_sysinfo(&mut snapshot);
        snapshot
    }

    // sysinfo fills cross-platform fields the /proc + lscpu parse misses: mounted
    // volumes, network adapters (MAC + IPs), CPU brand/frequency, and battery.
    // Linux-only because this build path also covers other Unix targets where the
    // sysinfo dependency is not declared.
    #[cfg(target_os = "linux")]
    fn enrich_from_sysinfo(snapshot: &mut PcInfoSnapshot) {
        use sysinfo::{Disks, Networks, System};

        let mut system = System::new();
        system.refresh_cpu_all();
        if let Some(cpu) = system.cpus().first() {
            if snapshot.cpu.name.is_none() {
                snapshot.cpu.name = clean(Some(cpu.brand().to_string()));
            }
            if snapshot.cpu.vendor.is_none() {
                snapshot.cpu.vendor = clean(Some(cpu.vendor_id().to_string()));
            }
            let mhz = cpu.frequency();
            if mhz > 0 && snapshot.cpu.max_clock_mhz.is_none() {
                snapshot.cpu.max_clock_mhz = Some(mhz);
            }
        }
        if snapshot.cpu.physical_cores.is_none() {
            snapshot.cpu.physical_cores = System::physical_core_count()
                .and_then(|count| u32::try_from(count).ok())
                .filter(|&count| count > 0);
        }

        let disks = Disks::new_with_refreshed_list();
        for disk in disks.list() {
            let total = disk.total_space();
            if total == 0 {
                continue;
            }
            snapshot.volumes.push(VolumeInfo {
                mount: clean(Some(disk.mount_point().to_string_lossy().into_owned())),
                label: clean(Some(disk.name().to_string_lossy().into_owned())),
                file_system: clean(Some(disk.file_system().to_string_lossy().into_owned())),
                total_bytes: Some(total),
                free_bytes: Some(disk.available_space()),
            });
        }

        let networks = Networks::new_with_refreshed_list();
        for (name, data) in &networks {
            let mac = data.mac_address().to_string();
            let ips: Vec<String> = data
                .ip_networks()
                .iter()
                .map(|ip| ip.addr.to_string())
                .collect();
            snapshot.network.push(NetworkAdapterInfo {
                name: clean(Some(name.clone())),
                mac_address: clean(Some(mac)).filter(|m| m != "00:00:00:00:00:00"),
                ip_addresses: ips,
                ..Default::default()
            });
        }

        if snapshot.battery.is_empty() {
            snapshot.battery = collect_batteries();
        }
    }

    #[cfg(not(target_os = "linux"))]
    fn enrich_from_sysinfo(_snapshot: &mut PcInfoSnapshot) {}

    // Physical drives from sysfs: model, capacity, and rotational flag → HDD/SSD.
    // Skips virtual/removable nodes (loop, ram, zram, device-mapper, optical).
    fn storage_from_sysfs() -> Vec<DiskInfo> {
        let Ok(entries) = fs::read_dir("/sys/block") else {
            return Vec::new();
        };
        let mut disks = Vec::new();
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with("loop")
                || name.starts_with("ram")
                || name.starts_with("zram")
                || name.starts_with("dm-")
                || name.starts_with("sr")
                || name.starts_with("md")
            {
                continue;
            }
            let base = entry.path();
            let size_sectors = fs::read_to_string(base.join("size"))
                .ok()
                .and_then(|raw| raw.trim().parse::<u64>().ok());
            let Some(sectors) = size_sectors.filter(|&s| s > 0) else {
                continue;
            };
            let model_path = base.join("device/model");
            let model = read_trimmed(model_path.to_string_lossy().as_ref());
            let media_type = match fs::read_to_string(base.join("queue/rotational")) {
                Ok(raw) if raw.trim() == "0" => Some("SSD".to_string()),
                Ok(raw) if raw.trim() == "1" => Some("HDD".to_string()),
                _ => None,
            };
            disks.push(DiskInfo {
                // Linux block size is 512 bytes per sector for the `size` attribute.
                model: model.or_else(|| clean(Some(name.clone()))),
                size_bytes: Some(sectors * 512),
                media_type,
                ..Default::default()
            });
        }
        disks
    }

    // Best-effort GPU list from `lspci -mm` (machine-readable, quoted fields).
    // Force the C locale so the device-class label stays English. Absent lspci is
    // a normal, non-error outcome.
    fn gpus_from_lspci() -> Vec<GpuInfo> {
        let Ok(output) = std::process::Command::new("lspci")
            .args(["-mm"])
            .env("LC_ALL", "C")
            .output()
        else {
            return Vec::new();
        };
        if !output.status.success() {
            return Vec::new();
        }
        let text = String::from_utf8_lossy(&output.stdout);
        let mut gpus = Vec::new();
        for line in text.lines() {
            let fields = parse_lspci_fields(line);
            // fields[0] = slot, [1] = class, [2] = vendor, [3] = device.
            let Some(class) = fields.get(1) else {
                continue;
            };
            if !(class.contains("VGA")
                || class.contains("3D controller")
                || class.contains("Display controller"))
            {
                continue;
            }
            gpus.push(GpuInfo {
                name: clean(fields.get(3).cloned()),
                vendor: clean(fields.get(2).cloned()),
                ..Default::default()
            });
        }
        gpus
    }

    // Split an `lspci -mm` line into its quoted fields, dropping trailing
    // -rNN / -pNN revision tokens and the unquoted slot prefix's quoting.
    fn parse_lspci_fields(line: &str) -> Vec<String> {
        let mut fields = Vec::new();
        let mut rest = line.trim();
        // Leading slot id is unquoted (e.g. "01:00.0"); capture it as field 0.
        if let Some(space) = rest.find(' ') {
            fields.push(rest[..space].to_string());
            rest = rest[space..].trim_start();
        }
        let bytes = rest.as_bytes();
        let mut i = 0;
        while i < bytes.len() {
            if bytes[i] == b'"' {
                let start = i + 1;
                let mut j = start;
                while j < bytes.len() && bytes[j] != b'"' {
                    j += 1;
                }
                fields.push(rest[start..j.min(bytes.len())].to_string());
                i = j + 1;
            } else {
                i += 1;
            }
        }
        fields
    }

    fn read_trimmed(path: &str) -> Option<String> {
        clean(fs::read_to_string(path).ok())
    }

    fn os_release_pretty_name() -> Option<String> {
        let text = fs::read_to_string("/etc/os-release").ok()?;
        for line in text.lines() {
            if let Some(value) = line.strip_prefix("PRETTY_NAME=") {
                return clean(Some(value.trim_matches('"').to_string()));
            }
        }
        None
    }

    fn read_uptime_seconds() -> Option<u64> {
        let text = fs::read_to_string("/proc/uptime").ok()?;
        text.split_whitespace()
            .next()
            .and_then(|v| v.parse::<f64>().ok())
            .map(|secs| secs as u64)
    }

    fn cpu_from_proc() -> CpuInfo {
        let mut info = CpuInfo {
            logical_processors: std::thread::available_parallelism()
                .ok()
                .map(|c| c.get() as u32),
            address_width_bits: Some(if cfg!(target_pointer_width = "64") { 64 } else { 32 }),
            ..Default::default()
        };
        if let Ok(text) = fs::read_to_string("/proc/cpuinfo") {
            for line in text.lines() {
                if let Some((key, value)) = line.split_once(':') {
                    let key = key.trim();
                    let value = value.trim();
                    match key {
                        "model name" if info.name.is_none() => {
                            info.name = clean(Some(value.to_string()));
                        }
                        "vendor_id" if info.vendor.is_none() => {
                            info.vendor = clean(Some(value.to_string()));
                        }
                        "cpu MHz" if info.max_clock_mhz.is_none() => {
                            info.max_clock_mhz = value.parse::<f64>().ok().map(|v| v as u64);
                        }
                        _ => {}
                    }
                }
            }
        }
        enrich_from_lscpu(&mut info);
        info
    }

    // lscpu fills clock, cache sizes, socket/core counts, and vendor that
    // /proc/cpuinfo does not expose cleanly. Force the C locale so the field
    // labels stay English regardless of the system language.
    fn enrich_from_lscpu(info: &mut CpuInfo) {
        let Ok(output) = std::process::Command::new("lscpu").env("LC_ALL", "C").output() else {
            return;
        };
        if !output.status.success() {
            return;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        let mut sockets: Option<u64> = None;
        let mut cores_per_socket: Option<u64> = None;
        for line in text.lines() {
            let Some((key, value)) = line.split_once(':') else {
                continue;
            };
            let value = value.trim();
            match key.trim() {
                "CPU max MHz" => {
                    if let Ok(mhz) = value.parse::<f64>() {
                        info.max_clock_mhz = Some(mhz as u64);
                    }
                }
                "L2 cache" if info.l2_cache_bytes.is_none() => {
                    info.l2_cache_bytes = parse_lscpu_size(value);
                }
                "L3 cache" if info.l3_cache_bytes.is_none() => {
                    info.l3_cache_bytes = parse_lscpu_size(value);
                }
                "Socket(s)" => sockets = value.parse().ok(),
                "Core(s) per socket" => cores_per_socket = value.parse().ok(),
                "Vendor ID" if info.vendor.is_none() => {
                    info.vendor = clean(Some(value.to_string()));
                }
                _ => {}
            }
        }
        if info.physical_cores.is_none() {
            if let (Some(s), Some(c)) = (sockets, cores_per_socket) {
                let total = s.saturating_mul(c);
                if total > 0 {
                    info.physical_cores = u32::try_from(total).ok();
                }
            }
        }
    }

    // Parse an lscpu size such as "1 MiB", "512 KiB", or "30 MiB (8 instances)".
    fn parse_lscpu_size(value: &str) -> Option<u64> {
        let value = value.trim();
        let digits: String = value
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        let number: f64 = digits.parse().ok()?;
        let unit = value[digits.len()..].trim_start().to_ascii_lowercase();
        let multiplier = if unit.starts_with("kib") || unit.starts_with('k') {
            1024.0
        } else if unit.starts_with("mib") || unit.starts_with('m') {
            1024.0 * 1024.0
        } else if unit.starts_with("gib") || unit.starts_with('g') {
            1024.0 * 1024.0 * 1024.0
        } else {
            1.0
        };
        Some((number * multiplier) as u64)
    }

    fn memory_from_proc() -> MemoryInfo {
        let mut total = None;
        let mut available = None;
        if let Ok(text) = fs::read_to_string("/proc/meminfo") {
            for line in text.lines() {
                if let Some(rest) = line.strip_prefix("MemTotal:") {
                    total = parse_kb(rest);
                } else if let Some(rest) = line.strip_prefix("MemAvailable:") {
                    available = parse_kb(rest);
                }
            }
        }
        let used_percent = match (total, available) {
            (Some(t), Some(a)) if t > 0 => Some((t.saturating_sub(a)) as f64 / t as f64 * 100.0),
            _ => None,
        };
        MemoryInfo {
            total_bytes: total,
            available_bytes: available,
            used_percent,
            ..Default::default()
        }
    }

    fn parse_kb(rest: &str) -> Option<u64> {
        rest.split_whitespace()
            .next()
            .and_then(|v| v.parse::<u64>().ok())
            .map(|kb| kb * 1024)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_gathers_once_then_reuses() {
        let cache = PcInfoCache::new();
        let first = cache.get_or_gather();
        assert!(first.generated_at_unix_seconds > 0);
        assert!(!first.source.is_empty());
        let second = cache.get_or_gather();
        // Cached value is returned unchanged (same gather timestamp).
        assert_eq!(first.generated_at_unix_seconds, second.generated_at_unix_seconds);
    }

    #[test]
    fn refresh_replaces_cache() {
        let cache = PcInfoCache::new();
        let _ = cache.get_or_gather();
        let refreshed = cache.refresh();
        assert!(!refreshed.source.is_empty());
    }

    #[test]
    fn civil_from_days_matches_known_dates() {
        // 1970-01-01 is day 0.
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        // 2000-01-01 is day 10957.
        assert_eq!(civil_from_days(10_957), (2000, 1, 1));
    }
}
