use std::collections::HashSet;

use oxc_allocator::Allocator;
use oxc_ast_visit::Visit;
use oxc_parser::Parser;
use oxc_span::SourceType;
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const PRESETS: &[&str] = &["panel", "ambient", "hero"];

pub const ACCENTS: &[&str] = &[
    "default", "blue", "indigo", "teal", "green", "amber", "red", "purple", "pink", "slate",
    "cyan", "orange", "rose", "emerald", "sky",
];

pub const ICONS: &[&str] = &[
    "Hash",
    "Network",
    "Terminal",
    "Server",
    "Cpu",
    "Activity",
    "Bolt",
    "Sun",
    "Bell",
    "Bot",
    "Wrench",
    "Folder",
    "Clock",
    "Doc",
    "Cloud",
    "Calendar",
    "Database",
    "Globe",
    "Lock",
    "Key",
    "Mail",
    "Mic",
    "Monitor",
    "Music",
    "Package",
    "Phone",
    "Pin",
    "Power",
    "Printer",
    "Radio",
    "Search",
    "Settings",
    "Shield",
    "ShoppingCart",
    "Star",
    "Tag",
    "Tool",
    "Trash",
    "Truck",
    "User",
    "Users",
    "Video",
    "Volume",
    "Watch",
    "Wifi",
    "Wind",
    "Zap",
    "Layers",
    "List",
    "Grid",
];

pub const BACKGROUND_PRESET_IDS: &[&str] = &[
    "mist",
    "sand",
    "sage",
    "sky",
    "blush",
    "lavender",
    "slate",
    "graphite",
    "midnight",
    "pine",
    "aubergine",
    "ember",
    "harbor",
    "moss",
    "wine",
    "steel",
    "g-dawn",
    "g-fog",
    "g-meadow",
    "g-dusk",
    "g-linen",
    "g-horizon",
    "g-petal",
    "g-twilight",
    "g-midnight",
    "g-harbor",
    "g-ember",
    "g-orchid",
    "g-forest",
    "g-eclipse",
    "g-cobalt",
    "g-nocturne",
];

pub const DASHBOARD_TAB_GRADIENT_IDS: &[&str] = &[
    "g-dawn",
    "g-fog",
    "g-meadow",
    "g-dusk",
    "g-linen",
    "g-horizon",
    "g-petal",
    "g-twilight",
    "g-midnight",
    "g-harbor",
    "g-ember",
    "g-orchid",
    "g-forest",
    "g-eclipse",
    "g-cobalt",
    "g-nocturne",
];

pub const DYNAMIC_BACKGROUND_IDS: &[&str] = &[
    "aurora",
    "clouds",
    "ocean",
    "raindrops",
    "snow",
    "sakura",
    "fireflies",
    "bubbles",
    "ricefield",
    "lanterns",
    "starfield",
    "nebula",
    "embers",
    "lava",
    "matrix",
    "topo",
    "synthwave",
    "cyberpunk",
    "taipei101",
    "thunderstorm",
    "confetti",
];

pub const BACKGROUND_FITS: &[&str] = &["fill", "fit", "stretch", "tile", "center"];

pub const GRID_COLUMNS: i64 = 12;
pub const GRID_MAX_ROWS: i64 = 1000;
pub const MAX_SCRIPT_SOURCE_BYTES: usize = 64 * 1024;
pub const MAX_SETTINGS_SCHEMA_BYTES: usize = 16 * 1024;
pub const MAX_SETTINGS_VALUES_BYTES: usize = 32 * 1024;
pub const MAX_SETTINGS_FIELDS: usize = 20;
pub const MAX_SELECT_OPTIONS: usize = 40;
pub const MIN_POLL_SECONDS: u64 = 1;
pub const MAX_WIDGET_LIBRARIES: usize = 8;
/// htmlShim is a mount-point fragment (`<div id='root'></div>`, layout
/// scaffolding, fixed canvas elements, occasional inline SVG icon paths or
/// templated rows for table-style widgets). 128 KB is a generous ceiling
/// that allows realistic prebuilt scaffolds without enabling a multi-MB
/// document dump.
pub const MAX_HTML_SHIM_BYTES: usize = 128 * 1024;

pub const KNOWN_LIBRARY_GLOBALS: &[(&str, &str)] = &[
    ("mermaid", "mermaid"),
    ("echarts", "echarts"),
    ("chartjs", "Chart"),
    ("qrcode", "QRCode"),
    ("jsbarcode", "JsBarcode"),
    ("jspdf", "jspdf"),
    ("mathjs", "math"),
    ("papaparse", "Papa"),
    ("pica", "pica"),
    ("dayjs", "dayjs"),
    ("konva", "Konva"),
    ("roughjs", "rough"),
    ("alasql", "alasql"),
    ("three", "THREE"),
    ("pixijs", "PIXI"),
    ("matter", "Matter"),
    ("prism", "Prism"),
    ("jsyaml", "jsyaml"),
    ("gridjs", "gridjs"),
    ("ansitohtml", "AnsiToHtml"),
    ("cronstrue", "cronstrue"),
    ("cronparser", "cronParser"),
    ("jwtdecode", "jwt_decode"),
    ("diffmatchpatch", "diff_match_patch"),
    ("chroma", "chroma"),
    ("leaflet", "L"),
    ("fflate", "fflate"),
    ("marked", "marked"),
    ("animejs", "anime"),
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ValidationError {
    InvalidPreset,
    InvalidAccent,
    InvalidIcon,
    InvalidGridBounds,
    InvalidKind,
    InvalidCustomWidgetKind,
    InvalidScriptBody,
    ScriptTooLarge,
    InvalidPermission,
    InvalidPollSeconds,
    InvalidLibraries,
    InvalidTitle,
    InvalidGridDensity,
    InvalidSettingsSchema,
    InvalidSettingsValues,
    InvalidBackground,
    InvalidScriptSource,
    UnusedLibrary,
    InvalidBodyOpacity,
}

pub fn validate_preset(value: &str) -> Result<(), ValidationError> {
    if PRESETS.contains(&value) {
        Ok(())
    } else {
        Err(ValidationError::InvalidPreset)
    }
}

pub fn validate_accent(value: &str) -> Result<(), ValidationError> {
    if ACCENTS.contains(&value) {
        Ok(())
    } else {
        Err(ValidationError::InvalidAccent)
    }
}

pub fn validate_icon(value: &str) -> Result<(), ValidationError> {
    if ICONS.contains(&value) {
        Ok(())
    } else {
        Err(ValidationError::InvalidIcon)
    }
}

pub fn validate_grid_bounds(x: i64, y: i64, w: i64, h: i64) -> Result<(), ValidationError> {
    let Some(right) = x.checked_add(w) else {
        return Err(ValidationError::InvalidGridBounds);
    };
    let Some(bottom) = y.checked_add(h) else {
        return Err(ValidationError::InvalidGridBounds);
    };
    if w < 1 || h < 1 || x < 0 || y < 0 || right > GRID_COLUMNS || bottom > GRID_MAX_ROWS {
        Err(ValidationError::InvalidGridBounds)
    } else {
        Ok(())
    }
}

pub fn validate_kind(kind: &str) -> Result<(), ValidationError> {
    if matches!(kind, "builtIn" | "script") {
        Ok(())
    } else {
        Err(ValidationError::InvalidKind)
    }
}

pub fn validate_grid_density(value: &str) -> Result<(), ValidationError> {
    if matches!(value, "compact" | "default" | "roomy") {
        Ok(())
    } else {
        Err(ValidationError::InvalidGridDensity)
    }
}

pub fn validate_title(value: &str) -> Result<(), ValidationError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > 120 {
        Err(ValidationError::InvalidTitle)
    } else {
        Ok(())
    }
}

pub fn validate_background_preset(preset: &str) -> Result<(), ValidationError> {
    if BACKGROUND_PRESET_IDS.contains(&preset) {
        Ok(())
    } else {
        Err(ValidationError::InvalidBackground)
    }
}

pub fn validate_dynamic_background(dynamic: &str) -> Result<(), ValidationError> {
    if DYNAMIC_BACKGROUND_IDS.contains(&dynamic) {
        Ok(())
    } else {
        Err(ValidationError::InvalidBackground)
    }
}

pub fn validate_dashboard_tab_color(color: &str) -> Result<(), ValidationError> {
    if DASHBOARD_TAB_GRADIENT_IDS.contains(&color) {
        Ok(())
    } else {
        Err(ValidationError::InvalidBackground)
    }
}

pub fn validate_background_image(file: &str, fit: &str, dim: i64) -> Result<(), ValidationError> {
    validate_background_media(
        file,
        fit,
        dim,
        &["png", "jpg", "jpeg", "webp", "gif", "bmp"],
    )
}

pub fn validate_background_video(file: &str, fit: &str, dim: i64) -> Result<(), ValidationError> {
    validate_background_media(file, fit, dim, &["mp4", "webm", "mov", "m4v", "ogv"])
}

fn validate_background_media(
    file: &str,
    fit: &str,
    dim: i64,
    extensions: &[&str],
) -> Result<(), ValidationError> {
    let file_ok =
        !file.is_empty() && !file.contains('/') && !file.contains('\\') && !file.contains("..");
    if !file_ok {
        return Err(ValidationError::InvalidBackground);
    }
    if !BACKGROUND_FITS.contains(&fit) {
        return Err(ValidationError::InvalidBackground);
    }
    if !(-100..=100).contains(&dim) {
        return Err(ValidationError::InvalidBackground);
    }
    let extension = file
        .rsplit_once('.')
        .map(|(_, extension)| extension.to_lowercase())
        .ok_or(ValidationError::InvalidBackground)?;
    if !extensions.contains(&extension.as_str()) {
        return Err(ValidationError::InvalidBackground);
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptBody {
    pub source: String,
    pub permissions: ScriptPermissions,
    #[serde(default)]
    pub html_shim: Option<String>,
    #[serde(default)]
    pub libraries: Option<Vec<String>>,
    /// Optional declared runtime lifecycle. When provided, the host
    /// enforces invariants the static prose contract used to merely
    /// request:
    ///   * `animation` widgets stall-watchdog: if the iframe stops emitting
    ///     `kk.motionTick` for >8 s while visible, the widget is marked
    ///     `stalled` in health state and surfaces in the AI context payload.
    ///   * `realtime` and `periodic` are reserved for future invariants
    ///     (data-freshness, frame-of-life heartbeats).
    ///   * `static` widgets opt out of any liveness check.
    /// Absent / null = `static`.
    #[serde(default)]
    pub lifecycle: Option<ScriptLifecycle>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptLifecycle {
    pub kind: ScriptLifecycleKind,
    /// For `animation` and `periodic` — minimum expected interval between
    /// frame ticks / data updates. Informational; the host clamps animation
    /// rAF callbacks to 33 ms regardless. Range: 16..=60_000.
    #[serde(default)]
    pub min_tick_ms: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScriptLifecycleKind {
    Static,
    Periodic,
    Animation,
    Realtime,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptPermissions {
    #[serde(default)]
    pub network: bool,
    #[serde(default)]
    pub poll_seconds: Option<u64>,
}

#[allow(dead_code)]
pub fn validate_script_body_json(json: &str) -> Result<ScriptBody, ValidationError> {
    validate_script_body_json_detailed(json).map_err(|(kind, _)| kind)
}

pub fn drop_unused_script_libraries(body: &mut Value) -> Vec<String> {
    let Some(source) = body
        .get("source")
        .and_then(Value::as_str)
        .map(str::to_owned)
    else {
        return Vec::new();
    };
    // Sanitizer runs BEFORE storage validation, so unparseable sources fall
    // through here — `validate_script_body_json_detailed` will reject them
    // downstream with a detailed error. We do nothing in that case rather
    // than mutating libraries based on a half-parsed source.
    let Ok(identifiers) = parse_script_source_ast(&source) else {
        return Vec::new();
    };
    let Some(libraries) = body.get_mut("libraries").and_then(Value::as_array_mut) else {
        return Vec::new();
    };

    let mut removed = Vec::new();
    libraries.retain(|entry| {
        let Some(key) = entry.as_str() else {
            return true;
        };
        let Some(&(_, global)) = KNOWN_LIBRARY_GLOBALS
            .iter()
            .find(|&&(known_key, _)| known_key == key)
        else {
            return true;
        };
        if identifiers.contains(global) {
            return true;
        }
        removed.push(key.to_string());
        false
    });
    removed
}

/// AST-based parse of widget script source.
///
/// Wraps `source` in the same synchronous IIFE the runtime host uses
/// (`(function(){ source })()`) and parses it with oxc_parser so a top-
/// level `return` is legal — matching what the iframe actually executes.
///
/// On success, walks the AST and collects every [`IdentifierReference`]
/// name. That set is the source of truth for the unused-library check
/// (declaring `libraries: ["three"]` is valid iff the identifier `THREE`
/// appears somewhere in the AST as a real reference, not inside a string
/// or a comment).
///
/// On failure, returns a short human-readable detail string with the
/// first parser error and its line/column so the assistant can self-
/// correct on the next tool round.
fn parse_script_source_ast(source: &str) -> Result<HashSet<String>, String> {
    let wrapped = format!("(function(){{\n{source}\n}})();");
    let allocator = Allocator::default();
    let source_type = SourceType::cjs();
    let ret = Parser::new(&allocator, &wrapped, source_type).parse();
    // Prefer the structured error (with location) over the bare panic flag,
    // since oxc sets `panicked` for unrecoverable parses but usually also
    // populates `errors` with the precise failure.
    if let Some(first) = ret.errors.first() {
        let line_col = first
            .labels
            .as_ref()
            .and_then(|labels| labels.first())
            .map(|label| {
                let start = label.offset();
                map_offset_to_line_col(&wrapped, start)
            });
        let location = match line_col {
            // The wrapper prepends one line; subtract it so the message
            // refers to the AI-authored source rather than the synthetic
            // IIFE.
            Some((line, col)) if line >= 1 => format!(" at line {} col {}", line, col),
            _ => String::new(),
        };
        return Err(format!(
            "script source is not parseable JavaScript{location}: {}",
            first.message
        ));
    }
    if ret.panicked {
        return Err(
            "script source is not parseable JavaScript (parser produced no diagnostic)"
                .to_string(),
        );
    }
    let mut collector = IdentifierCollector {
        names: HashSet::new(),
    };
    collector.visit_program(&ret.program);
    Ok(collector.names)
}

struct IdentifierCollector {
    names: HashSet<String>,
}

impl<'a> Visit<'a> for IdentifierCollector {
    fn visit_identifier_reference(&mut self, it: &oxc_ast::ast::IdentifierReference<'a>) {
        self.names.insert(it.name.to_string());
    }
}

fn map_offset_to_line_col(source: &str, offset: usize) -> (u32, u32) {
    let mut line: u32 = 1;
    let mut col: u32 = 1;
    for (i, ch) in source.char_indices() {
        if i >= offset {
            break;
        }
        if ch == '\n' {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }
    // Wrapper occupies line 1; report widget-source-relative line.
    (line.saturating_sub(1), col)
}

/// Tags an `htmlShim` is never allowed to contain. The CSP blocks `script`
/// / `iframe` / `object` / `embed` at runtime, but rejecting at validation
/// gives the assistant a clean structured error to self-correct against.
/// Document-shell tags (`html`, `head`, `body`, `meta`, `title`, `link`)
/// are rejected because the shim is supposed to be a small fragment
/// dropped into the host document's `<body>` — shipping a second document
/// inside the shim breaks layout in undefined ways.
const HTML_SHIM_FORBIDDEN_TAGS: &[&str] = &[
    "script", "iframe", "object", "embed", "html", "head", "body", "meta", "title", "link",
];

fn validate_html_shim(shim: &str) -> Result<(), String> {
    if shim.is_empty() {
        return Ok(());
    }
    if shim.len() > MAX_HTML_SHIM_BYTES {
        return Err(format!(
            "htmlShim is {} bytes; max is {} bytes",
            shim.len(),
            MAX_HTML_SHIM_BYTES
        ));
    }
    if shim.contains('\0') {
        return Err("htmlShim contains null bytes".to_string());
    }
    let lower = shim.to_ascii_lowercase();
    for tag in HTML_SHIM_FORBIDDEN_TAGS {
        if html_shim_contains_tag_open(&lower, tag) {
            return Err(format!(
                "htmlShim contains forbidden tag <{tag}>; the shim must be a small mount-point fragment without scripts, plugins, or document-shell elements"
            ));
        }
    }
    Ok(())
}

/// Whole-token match for `<tag` so `<scripty>` does not match `<script`.
/// `lower_haystack` must already be ASCII-lowercased so the comparison is
/// case-insensitive against the forbidden list.
fn html_shim_contains_tag_open(lower_haystack: &str, tag: &str) -> bool {
    let needle = format!("<{tag}");
    let bytes = lower_haystack.as_bytes();
    let needle_bytes = needle.as_bytes();
    let n = needle_bytes.len();
    if n == 0 || bytes.len() < n {
        return false;
    }
    let mut i = 0;
    while i + n <= bytes.len() {
        if &bytes[i..i + n] == needle_bytes {
            match bytes.get(i + n).copied() {
                None => return true,
                Some(b) if b.is_ascii_alphanumeric() => {}
                Some(_) => return true,
            }
        }
        i += 1;
    }
    false
}

/// Same as `validate_script_body_json`, but also surfaces a human-readable
/// detail string explaining which check failed. The detail is passed back to
/// agents/clients so they can correct widget source without re-guessing.
pub fn validate_script_body_json_detailed(
    json: &str,
) -> Result<ScriptBody, (ValidationError, Option<String>)> {
    // Envelope cap accommodates the maximum source + htmlShim + a buffer for
    // other fields (permissions / libraries / lifecycle / structural JSON).
    let envelope_cap = MAX_SCRIPT_SOURCE_BYTES + MAX_HTML_SHIM_BYTES + 4096;
    if json.len() > envelope_cap {
        return Err((
            ValidationError::ScriptTooLarge,
            Some(format!(
                "script bodyJson is {} bytes; envelope limit is {} bytes",
                json.len(),
                envelope_cap
            )),
        ));
    }
    let parsed: ScriptBody = serde_json::from_str(json).map_err(|error| {
        (
            ValidationError::InvalidScriptBody,
            Some(format!("script bodyJson did not parse: {error}")),
        )
    })?;
    if parsed.source.trim().is_empty() {
        return Err((
            ValidationError::InvalidScriptBody,
            Some("script body 'source' is empty after trimming".to_string()),
        ));
    }
    if parsed.source.len() > MAX_SCRIPT_SOURCE_BYTES {
        return Err((
            ValidationError::ScriptTooLarge,
            Some(format!(
                "script source is {} bytes; max is {}",
                parsed.source.len(),
                MAX_SCRIPT_SOURCE_BYTES
            )),
        ));
    }
    if let Some(secs) = parsed.permissions.poll_seconds {
        if secs < MIN_POLL_SECONDS {
            return Err((
                ValidationError::InvalidPollSeconds,
                Some(format!(
                    "permissions.pollSeconds is {secs}; minimum is {MIN_POLL_SECONDS}"
                )),
            ));
        }
    }
    if let Some(lifecycle) = &parsed.lifecycle {
        if let Some(min_tick) = lifecycle.min_tick_ms {
            // 16 ms floor matches a 60 fps frame; 60 s ceiling is well past
            // any sensible declared minimum.
            if !(16..=60_000).contains(&min_tick) {
                return Err((
                    ValidationError::InvalidScriptBody,
                    Some(format!(
                        "lifecycle.minTickMs is {min_tick}; must be in 16..=60000"
                    )),
                ));
            }
        }
    }
    if let Some(libs) = &parsed.libraries {
        if libs.len() > MAX_WIDGET_LIBRARIES {
            return Err((
                ValidationError::InvalidLibraries,
                Some(format!(
                    "{} libraries listed; max is {}",
                    libs.len(),
                    MAX_WIDGET_LIBRARIES
                )),
            ));
        }
        for entry in libs {
            if !is_valid_library_key(entry) {
                return Err((
                    ValidationError::InvalidLibraries,
                    Some(format!(
                        "invalid library key {entry:?}; expected lowercase ASCII id"
                    )),
                ));
            }
        }
    }
    // Harden 1a: heuristic safety pass — null bytes and obvious infinite
    // loops. The AST stage (1b) owns syntactic correctness; this pass
    // catches semantic patterns oxc_parser will accept (e.g. while(true)
    // is valid JS that we still forbid for widgets).
    validate_script_source_inner(&parsed.source)
        .map_err(|detail| (ValidationError::InvalidScriptSource, Some(detail)))?;
    // Harden 1b: AST parse — catches every grammar error the heuristic
    // delimiter pass cannot (missing operators, malformed declarations,
    // regex literals the heuristic flagged falsely, template-literal
    // interpolation issues, etc.). The returned identifier set is reused
    // below for the unused-library cross-reference so we don't fall back
    // to text scanning that misses identifier references inside template
    // literal `${...}` interpolations.
    let identifiers = parse_script_source_ast(&parsed.source)
        .map_err(|detail| (ValidationError::InvalidScriptSource, Some(detail)))?;
    if let Some(shim) = parsed.html_shim.as_deref() {
        validate_html_shim(shim)
            .map_err(|detail| (ValidationError::InvalidScriptSource, Some(detail)))?;
    }
    validate_script_dom_mounts(&parsed.source, parsed.html_shim.as_deref())
        .map_err(|detail| (ValidationError::InvalidScriptSource, Some(detail)))?;
    if let Some(libs) = &parsed.libraries {
        // Harden 4: every listed library global must appear as an identifier
        // reference in the parsed AST. A library that loads but is never
        // called wastes ~80KB+ and adds GC pressure. The AST set is exact
        // (no string/comment false-positives, no false-negatives from
        // template-literal interpolation), so this replaces the previous
        // text-based word-boundary scan.
        for entry in libs {
            if let Some(&(_, global)) = KNOWN_LIBRARY_GLOBALS
                .iter()
                .find(|&&(key, _)| key == entry.as_str())
            {
                if !identifiers.contains(global) {
                    return Err((
                        ValidationError::UnusedLibrary,
                        Some(format!(
                            "library {entry:?} (global {global:?}) is declared but never referenced in the script source; remove it from body.libraries"
                        )),
                    ));
                }
            }
        }
    }
    Ok(parsed)
}

fn validate_script_dom_mounts(source: &str, html_shim: Option<&str>) -> Result<(), String> {
    for id in extract_get_element_by_id_targets(source) {
        if id == "root" || html_shim_contains_id(html_shim, &id) || source_creates_id(source, &id)
        {
            continue;
        }
        return Err(format!(
            "script calls document.getElementById({id:?}) but no matching element exists in htmlShim and the source does not create that id; mount from document.getElementById('root') or create the element before reading properties such as innerHTML"
        ));
    }
    Ok(())
}

fn extract_get_element_by_id_targets(source: &str) -> Vec<String> {
    let mut ids = Vec::new();
    let needle = "document.getElementById";
    let bytes = source.as_bytes();
    let mut offset = 0;
    while let Some(relative) = source[offset..].find(needle) {
        let mut i = offset + relative + needle.len();
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if bytes.get(i) != Some(&b'(') {
            offset = i;
            continue;
        }
        i += 1;
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let Some(&quote) = bytes.get(i) else {
            offset = i;
            continue;
        };
        if quote != b'\'' && quote != b'"' {
            offset = i;
            continue;
        }
        i += 1;
        let start = i;
        let mut escaped = false;
        while i < bytes.len() {
            let byte = bytes[i];
            if byte == b'\\' && !escaped {
                escaped = true;
                i += 1;
                continue;
            }
            if byte == quote && !escaped {
                ids.push(source[start..i].to_string());
                break;
            }
            escaped = false;
            i += 1;
        }
        offset = i.saturating_add(1);
    }
    ids
}

fn html_shim_contains_id(html_shim: Option<&str>, id: &str) -> bool {
    let Some(html_shim) = html_shim else {
        return false;
    };
    html_shim.contains(&format!("id=\"{id}\"")) || html_shim.contains(&format!("id='{id}'"))
}

fn source_creates_id(source: &str, id: &str) -> bool {
    source.contains(&format!(".id = \"{id}\""))
        || source.contains(&format!(".id = '{id}'"))
        || source.contains(&format!(".id=\"{id}\""))
        || source.contains(&format!(".id='{id}'"))
        || source.contains(&format!("setAttribute(\"id\", \"{id}\")"))
        || source.contains(&format!("setAttribute('id', '{id}')"))
        || source.contains(&format!("setAttribute(\"id\",\"{id}\")"))
        || source.contains(&format!("setAttribute('id','{id}')"))
}

fn is_valid_library_key(value: &str) -> bool {
    if value.is_empty() || value.len() > 32 {
        return false;
    }
    let mut chars = value.chars();
    let first = chars.next();
    if !matches!(first, Some(c) if c.is_ascii_lowercase()) {
        return false;
    }
    chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '-')
}

/// Harden 1: semantic prefilter — catches what oxc_parser will not, since a
/// well-formed `while(true){}` is valid JavaScript that we still reject for
/// dashboard widgets. The AST stage owns syntactic correctness (delimiters,
/// grammar, regex literals); this pass only enforces the runtime-safety
/// rules the parser cannot see:
///   * null bytes (filesystem / WebView2 hazard)
///   * `while(true)`, `while(1)`, `for(;;)` infinite loops
///
/// Limitation: `${expr}` interpolation inside template literals is treated
/// as part of the string, so a `while(true)` hidden there would not be
/// caught. The active-widget cap and visibility throttle still apply, so
/// the impact is bounded.
fn validate_script_source_inner(source: &str) -> Result<(), String> {
    if source.contains('\0') {
        return Err("script source contains null bytes".to_string());
    }
    let code_only = strip_strings_and_comments(source);
    let collapsed: String = code_only.chars().filter(|c| !c.is_whitespace()).collect();
    if collapsed.contains("while(true)") || collapsed.contains("while(1)") {
        return Err(
            "infinite loop detected: while(true) or while(1) is forbidden in widget scripts"
                .to_string(),
        );
    }
    if collapsed.contains("for(;;)") {
        return Err("infinite loop detected: for(;;) is forbidden in widget scripts".to_string());
    }
    Ok(())
}

/// Returns the source with strings, template literals, and comments replaced
/// by spaces (same character count, so byte offsets are preserved for any
/// future diagnostic use). Used by [`validate_script_source_inner`] so its
/// infinite-loop scan ignores `while(true)` text appearing inside a string
/// literal or comment. Does not need to be aware of regex literals because
/// the scan it feeds only looks at three specific token sequences; the AST
/// stage handles syntactic correctness including regex parsing.
fn strip_strings_and_comments(source: &str) -> String {
    #[derive(Copy, Clone, PartialEq, Eq)]
    enum State {
        Normal,
        Single,
        Double,
        Template,
        LineComment,
        BlockComment,
    }
    let chars: Vec<char> = source.chars().collect();
    let mut out = String::with_capacity(source.len());
    let mut state = State::Normal;
    let mut backslashes: u32 = 0;
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        let next = chars.get(i + 1).copied();
        match state {
            State::Normal => match ch {
                '/' if next == Some('/') => {
                    state = State::LineComment;
                    out.push(' ');
                    out.push(' ');
                    i += 2;
                    continue;
                }
                '/' if next == Some('*') => {
                    state = State::BlockComment;
                    out.push(' ');
                    out.push(' ');
                    i += 2;
                    continue;
                }
                '\'' => {
                    state = State::Single;
                    backslashes = 0;
                    out.push(' ');
                }
                '"' => {
                    state = State::Double;
                    backslashes = 0;
                    out.push(' ');
                }
                '`' => {
                    state = State::Template;
                    backslashes = 0;
                    out.push(' ');
                }
                _ => out.push(ch),
            },
            State::Single | State::Double | State::Template => {
                let closer = match state {
                    State::Single => '\'',
                    State::Double => '"',
                    State::Template => '`',
                    _ => unreachable!(),
                };
                // Track consecutive backslashes so '\\' closes the string but '\\\'' does not.
                if ch == '\\' {
                    backslashes += 1;
                } else {
                    let escaped = backslashes % 2 == 1;
                    if ch == closer && !escaped {
                        state = State::Normal;
                    }
                    backslashes = 0;
                }
                // Preserve newlines so line-based tooling still works; everything
                // else inside a string becomes a space.
                out.push(if ch == '\n' { '\n' } else { ' ' });
            }
            State::LineComment => {
                if ch == '\n' {
                    state = State::Normal;
                    out.push('\n');
                } else {
                    out.push(' ');
                }
            }
            State::BlockComment => {
                if ch == '*' && next == Some('/') {
                    state = State::Normal;
                    out.push(' ');
                    out.push(' ');
                    i += 2;
                    continue;
                }
                out.push(if ch == '\n' { '\n' } else { ' ' });
            }
        }
        i += 1;
    }
    out
}

#[allow(dead_code)]
pub fn validate_custom_body_json(body_json: &str) -> Result<(), ValidationError> {
    validate_custom_body_json_detailed(body_json).map_err(|(kind, _)| kind)
}

pub fn validate_custom_body_json_detailed(
    body_json: &str,
) -> Result<(), (ValidationError, Option<String>)> {
    validate_script_body_json_detailed(body_json).map(|_| ())
}

fn valid_settings_key(value: &str) -> bool {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() => {}
        _ => return false,
    }
    value.len() <= 64 && chars.all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
}

pub fn validate_settings_schema_json(json: &str) -> Result<(), ValidationError> {
    if json.len() > MAX_SETTINGS_SCHEMA_BYTES {
        return Err(ValidationError::InvalidSettingsSchema);
    }
    let parsed: Value =
        serde_json::from_str(json).map_err(|_| ValidationError::InvalidSettingsSchema)?;
    let fields = parsed
        .get("fields")
        .and_then(Value::as_array)
        .ok_or(ValidationError::InvalidSettingsSchema)?;
    if fields.len() > MAX_SETTINGS_FIELDS {
        return Err(ValidationError::InvalidSettingsSchema);
    }
    let mut keys = std::collections::HashSet::new();
    for field in fields {
        let object = field
            .as_object()
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        let field_type = object
            .get("type")
            .and_then(Value::as_str)
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        let key = object
            .get("key")
            .and_then(Value::as_str)
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        let label = object
            .get("label")
            .and_then(Value::as_str)
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        if !valid_settings_key(key) || label.trim().is_empty() || !keys.insert(key.to_string()) {
            return Err(ValidationError::InvalidSettingsSchema);
        }
        match field_type {
            "text" => {
                if object
                    .get("placeholder")
                    .is_some_and(|value| !value.is_string() && !value.is_null())
                {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
                if object
                    .get("defaultValue")
                    .is_some_and(|value| !value.is_string() && !value.is_null())
                {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
            }
            "number" => {
                for key in ["min", "max", "defaultValue"] {
                    if object
                        .get(key)
                        .is_some_and(|value| !value.is_number() && !value.is_null())
                    {
                        return Err(ValidationError::InvalidSettingsSchema);
                    }
                }
                if object.get("step").is_some_and(|value| {
                    value.is_null() || value.as_f64().is_some_and(|number| number > 0.0)
                }) {
                    // Valid optional step.
                } else if object.contains_key("step") {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
            }
            "boolean" => {
                if object
                    .get("defaultValue")
                    .is_some_and(|value| !value.is_boolean() && !value.is_null())
                {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
            }
            "secret" => {
                if object
                    .get("placeholder")
                    .is_some_and(|value| !value.is_string() && !value.is_null())
                {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
                if object.contains_key("defaultValue") {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
            }
            "select" => {
                if object
                    .get("defaultValue")
                    .is_some_and(|value| !value.is_string() && !value.is_null())
                {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
                let options = object
                    .get("options")
                    .and_then(Value::as_array)
                    .ok_or(ValidationError::InvalidSettingsSchema)?;
                if options.is_empty() || options.len() > MAX_SELECT_OPTIONS {
                    return Err(ValidationError::InvalidSettingsSchema);
                }
                for option in options {
                    let option = option
                        .as_object()
                        .ok_or(ValidationError::InvalidSettingsSchema)?;
                    let label = option
                        .get("label")
                        .and_then(Value::as_str)
                        .ok_or(ValidationError::InvalidSettingsSchema)?;
                    if label.trim().is_empty() || !option.get("value").is_some_and(Value::is_string)
                    {
                        return Err(ValidationError::InvalidSettingsSchema);
                    }
                }
            }
            _ => return Err(ValidationError::InvalidSettingsSchema),
        }
    }
    Ok(())
}

pub fn dashboard_widget_secret_owner_id(instance_id: &str, key: &str) -> String {
    format!("dashboard-widget-secret:{instance_id}:{key}")
}

pub fn validate_settings_values_for_schema_json(
    schema_json: &str,
    values_json: &str,
    instance_id: &str,
) -> Result<(), ValidationError> {
    validate_settings_schema_json(schema_json)?;
    validate_settings_values_json(values_json)?;

    let schema: Value =
        serde_json::from_str(schema_json).map_err(|_| ValidationError::InvalidSettingsSchema)?;
    let values: Value =
        serde_json::from_str(values_json).map_err(|_| ValidationError::InvalidSettingsValues)?;
    let Some(value_object) = values.as_object() else {
        return Err(ValidationError::InvalidSettingsValues);
    };

    let fields = schema
        .get("fields")
        .and_then(Value::as_array)
        .ok_or(ValidationError::InvalidSettingsSchema)?;
    for field in fields {
        let object = field
            .as_object()
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        if object.get("type").and_then(Value::as_str) != Some("secret") {
            continue;
        }
        let key = object
            .get("key")
            .and_then(Value::as_str)
            .ok_or(ValidationError::InvalidSettingsSchema)?;
        let Some(value) = value_object.get(key) else {
            continue;
        };
        if value.is_null() {
            continue;
        }
        let Some(secret_ref) = value.as_object() else {
            return Err(ValidationError::InvalidSettingsValues);
        };
        let expected_owner_id = dashboard_widget_secret_owner_id(instance_id, key);
        let valid_ref = secret_ref.get("type").and_then(Value::as_str) == Some("secretRef")
            && secret_ref.get("ownerId").and_then(Value::as_str)
                == Some(expected_owner_id.as_str())
            && secret_ref.get("hasSecret").and_then(Value::as_bool) == Some(true)
            && secret_ref
                .get("updatedAt")
                .is_none_or(|value| value.is_string());
        if !valid_ref {
            return Err(ValidationError::InvalidSettingsValues);
        }
    }
    Ok(())
}

pub fn validate_settings_values_json(json: &str) -> Result<(), ValidationError> {
    if json.len() > MAX_SETTINGS_VALUES_BYTES {
        return Err(ValidationError::InvalidSettingsValues);
    }
    let parsed: Value =
        serde_json::from_str(json).map_err(|_| ValidationError::InvalidSettingsValues)?;
    if parsed.is_object() {
        Ok(())
    } else {
        Err(ValidationError::InvalidSettingsValues)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_known() {
        assert!(validate_preset("panel").is_ok());
    }

    #[test]
    fn preset_unknown() {
        assert_eq!(
            validate_preset("does-not-exist"),
            Err(ValidationError::InvalidPreset)
        );
    }

    #[test]
    fn preset_mono_is_removed() {
        assert_eq!(validate_preset("mono"), Err(ValidationError::InvalidPreset));
    }

    #[test]
    fn preset_tile_and_action_are_removed() {
        assert_eq!(validate_preset("tile"), Err(ValidationError::InvalidPreset));
        assert_eq!(validate_preset("action"), Err(ValidationError::InvalidPreset));
    }

    #[test]
    fn accent_unknown() {
        assert_eq!(validate_accent("neon"), Err(ValidationError::InvalidAccent));
    }

    #[test]
    fn accent_default_uses_theme_accent() {
        assert!(validate_accent("default").is_ok());
    }

    #[test]
    fn icon_unknown() {
        assert_eq!(
            validate_icon("NotAnIcon"),
            Err(ValidationError::InvalidIcon)
        );
    }

    #[test]
    fn grid_bounds_in_range() {
        assert!(validate_grid_bounds(0, 0, 4, 3).is_ok());
    }

    #[test]
    fn grid_bounds_overflow() {
        assert_eq!(
            validate_grid_bounds(10, 0, 4, 1),
            Err(ValidationError::InvalidGridBounds),
        );
    }

    #[test]
    fn grid_bounds_zero_size() {
        assert_eq!(
            validate_grid_bounds(0, 0, 0, 1),
            Err(ValidationError::InvalidGridBounds),
        );
    }

    #[test]
    fn grid_bounds_rejects_absurd_y() {
        assert_eq!(
            validate_grid_bounds(0, i64::MAX, 4, 3),
            Err(ValidationError::InvalidGridBounds),
        );
        assert_eq!(
            validate_grid_bounds(0, GRID_MAX_ROWS, 4, 1),
            Err(ValidationError::InvalidGridBounds),
        );
    }

    #[test]
    fn grid_density_known() {
        assert!(validate_grid_density("compact").is_ok());
    }

    #[test]
    fn grid_density_unknown() {
        assert_eq!(
            validate_grid_density("huge"),
            Err(ValidationError::InvalidGridDensity)
        );
    }

    #[test]
    fn title_empty_rejected() {
        assert_eq!(validate_title("   "), Err(ValidationError::InvalidTitle));
    }

    #[test]
    fn content_instance_kind_is_rejected() {
        assert_eq!(validate_kind("content"), Err(ValidationError::InvalidKind));
    }

    #[test]
    fn script_ok() {
        let json = r#"{"source":"console.log(1)","permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    #[test]
    fn script_poll_zero_rejected() {
        let json = r#"{"source":"x","permissions":{"network":false,"pollSeconds":0}}"#;
        assert_eq!(
            validate_script_body_json(&json),
            Err(ValidationError::InvalidPollSeconds),
        );
    }

    #[test]
    fn script_empty_source_rejected() {
        let json = r#"{"source":"   ","permissions":{"network":false}}"#;
        assert_eq!(
            validate_script_body_json(&json),
            Err(ValidationError::InvalidScriptBody),
        );
    }

    #[test]
    fn script_too_large_rejected() {
        let big = "x".repeat(MAX_SCRIPT_SOURCE_BYTES + 1);
        let json = format!(
            r#"{{"source":{:?},"permissions":{{"network":false}}}}"#,
            big
        );
        assert_eq!(
            validate_script_body_json(&json),
            Err(ValidationError::ScriptTooLarge),
        );
    }

    #[test]
    fn settings_schema_ok() {
        let json = r#"{"fields":[{"type":"text","key":"username","label":"Name"},{"type":"select","key":"mode","label":"Mode","options":[{"label":"A","value":"a"}]},{"type":"secret","key":"apiKey","label":"API key"}]}"#;
        assert!(validate_settings_schema_json(json).is_ok());
    }

    #[test]
    fn settings_schema_rejects_duplicate_keys() {
        let json = r#"{"fields":[{"type":"text","key":"name","label":"Name"},{"type":"boolean","key":"name","label":"Enabled"}]}"#;
        assert_eq!(
            validate_settings_schema_json(json),
            Err(ValidationError::InvalidSettingsSchema),
        );
    }

    #[test]
    fn settings_values_must_be_object() {
        assert_eq!(
            validate_settings_values_json("[]"),
            Err(ValidationError::InvalidSettingsValues),
        );
    }

    #[test]
    fn background_preset_known() {
        assert!(validate_background_preset("mist").is_ok());
        assert!(validate_background_preset("g-twilight").is_ok());
        assert!(validate_background_preset("midnight").is_ok());
        assert!(validate_background_preset("g-nocturne").is_ok());
    }

    #[test]
    fn background_preset_unknown() {
        assert_eq!(
            validate_background_preset("neon-explosion"),
            Err(ValidationError::InvalidBackground),
        );
    }

    #[test]
    fn dashboard_tab_color_accepts_gradient_presets() {
        assert!(validate_dashboard_tab_color("g-dawn").is_ok());
        assert!(validate_dashboard_tab_color("g-twilight").is_ok());
        assert!(validate_dashboard_tab_color("g-nocturne").is_ok());
    }

    #[test]
    fn dashboard_tab_color_rejects_custom_or_solid_colors() {
        assert_eq!(
            validate_dashboard_tab_color("#2563eb"),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_dashboard_tab_color("mist"),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_dashboard_tab_color("neon-explosion"),
            Err(ValidationError::InvalidBackground),
        );
    }

    #[test]
    fn background_image_ok() {
        assert!(validate_background_image("bg-abc123.jpg", "fill", 0).is_ok());
        assert!(validate_background_image("bg-abc123.jpg", "center", -100).is_ok());
        assert!(validate_background_image("bg-abc123.jpg", "tile", 100).is_ok());
    }

    #[test]
    fn background_video_ok() {
        assert!(validate_background_video("bg-abc123.mp4", "fill", 0).is_ok());
        assert!(validate_background_video("bg-abc123.webm", "fit", -20).is_ok());
        assert!(validate_background_video("bg-abc123.mov", "stretch", 30).is_ok());
    }

    #[test]
    fn background_image_rejects_path_separators() {
        assert_eq!(
            validate_background_image("../secret.jpg", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_background_image("sub/dir.jpg", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_background_image("a\\b.jpg", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_background_image("", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
    }

    #[test]
    fn background_image_rejects_bad_fit() {
        assert_eq!(
            validate_background_image("bg.jpg", "zoom", 0),
            Err(ValidationError::InvalidBackground),
        );
    }

    #[test]
    fn background_media_rejects_wrong_kind_extension() {
        assert_eq!(
            validate_background_image("bg.mp4", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_background_video("bg.jpg", "fill", 0),
            Err(ValidationError::InvalidBackground),
        );
    }

    #[test]
    fn background_image_rejects_dim_out_of_range() {
        assert_eq!(
            validate_background_image("bg.jpg", "fill", 101),
            Err(ValidationError::InvalidBackground),
        );
        assert_eq!(
            validate_background_image("bg.jpg", "fill", -101),
            Err(ValidationError::InvalidBackground),
        );
    }

    // --- validate_script_source ---------------------------------------------

    #[test]
    fn script_source_accepts_typical_widget() {
        assert!(validate_script_source_inner(
            "const ctx = root.getContext('2d'); function draw(){ if (gameOver) return; requestAnimationFrame(draw); } draw();"
        )
        .is_ok());
    }

    #[test]
    fn script_source_rejects_while_true_in_code() {
        assert!(validate_script_source_inner("while (true) { doStuff(); }").is_err());
        assert!(validate_script_source_inner("while(1){ doStuff(); }").is_err());
        assert!(validate_script_source_inner("for (;;) { doStuff(); }").is_err());
    }

    #[test]
    fn script_source_allows_while_true_inside_string() {
        // Regression: the original collapsed-string check rejected scripts that
        // merely mentioned "while(true)" in a string or comment.
        assert!(validate_script_source_inner(
            "const note = 'never use while(true) here'; console.log(note);"
        )
        .is_ok());
        assert!(validate_script_source_inner(
            "// avoid while(true) and for(;;) in widget scripts\nconsole.log(1);"
        )
        .is_ok());
        assert!(validate_script_source_inner(
            "/* docs say while(true) is forbidden */ console.log(1);"
        )
        .is_ok());
    }

    #[test]
    fn script_source_handles_escaped_backslash_in_string() {
        // Regression: the original prev != '\\' check left the parser stuck in
        // a string after an escaped backslash, then reported unbalanced delims.
        assert!(validate_script_source_inner(
            "const path = 'C:\\\\Users\\\\widget'; console.log(path);"
        )
        .is_ok());
        // Real backslash-escaped quote stays inside the string.
        assert!(validate_script_source_inner("const q = 'it\\'s fine'; console.log(q);").is_ok());
    }

    #[test]
    fn script_body_rejects_unbalanced_delimiters() {
        // Delimiter correctness now belongs to the AST stage. The error
        // path is still `InvalidScriptSource`; only the source of the
        // rejection moved from the heuristic to oxc_parser.
        for source in [
            "function f() { return 1;",
            "const a = [1, 2, 3",
            "const a = (1 + 2;",
        ] {
            let body = serde_json::json!({
                "source": source,
                "permissions": {"network": false},
            });
            let err = validate_script_body_json_detailed(&body.to_string())
                .expect_err("unbalanced delimiters must be rejected");
            assert_eq!(err.0, ValidationError::InvalidScriptSource, "{source}");
        }
    }

    #[test]
    fn script_source_allows_braces_inside_template_literals() {
        // We treat template literals as opaque strings — `${expr}` braces inside
        // do not affect the outer delimiter balance.
        assert!(validate_script_source_inner(
            "const s = `hello {world}`; const t = `${1 + 2}`; console.log(s, t);"
        )
        .is_ok());
    }

    #[test]
    fn script_source_rejects_null_byte() {
        assert!(validate_script_source_inner("console.log(1);\0").is_err());
    }

    #[test]
    fn script_body_rejects_missing_get_element_by_id_target() {
        let json = r#"{"source":"document.getElementById('game').innerHTML = 'ready';","permissions":{"network":false}}"#;
        let err = validate_script_body_json_detailed(json).expect_err("missing target rejected");

        assert_eq!(err.0, ValidationError::InvalidScriptSource);
        assert!(err.1.unwrap().contains("document.getElementById"));
    }

    #[test]
    fn script_body_accepts_get_element_by_id_target_from_html_shim() {
        let json = r#"{"source":"document.getElementById('game').innerHTML = 'ready';","htmlShim":"<div id=\"game\"></div>","permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    #[test]
    fn script_body_accepts_root_mount_target() {
        let json = r#"{"source":"document.getElementById('root').replaceChildren(document.createElement('div'));","permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    // --- unused-library detection -------------------------------------------

    #[test]
    fn unused_library_short_global_word_boundary() {
        // `L` (Leaflet) must not match `null`, `let`, `class`, etc.
        let json = r#"{"source":"const x = null; let y = 0; class Foo {}","libraries":["leaflet"],"permissions":{"network":true}}"#;
        assert_eq!(
            validate_script_body_json(json),
            Err(ValidationError::UnusedLibrary),
        );
    }

    #[test]
    fn unused_library_short_global_accepts_real_use() {
        let json = r#"{"source":"const map = L.map(root).setView([0,0], 2);","libraries":["leaflet"],"permissions":{"network":true}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    #[test]
    fn unused_library_ignores_reference_in_comment_or_string() {
        // The original check used `source.contains(global)`, which would pass
        // a library whose global appears only in a comment. The code-only view
        // now strips comments and string literals.
        let json = r#"{"source":"// uses chroma later\nconsole.log('chroma');","libraries":["chroma"],"permissions":{"network":false}}"#;
        assert_eq!(
            validate_script_body_json(json),
            Err(ValidationError::UnusedLibrary),
        );
    }

    #[test]
    fn unused_library_detects_documented_global() {
        // The original incident: matter and animejs declared, never called.
        let json = r#"{"source":"const board = []; function step(){ board.push(1); } step();","libraries":["matter","animejs"],"permissions":{"network":false}}"#;
        assert_eq!(
            validate_script_body_json(json),
            Err(ValidationError::UnusedLibrary),
        );
    }

    #[test]
    fn unused_libraries_can_be_dropped_before_ai_tool_validation() {
        let mut body = serde_json::json!({
            "source": "const root = document.getElementById('root'); root.textContent = new Date().toLocaleTimeString();",
            "libraries": ["dayjs", "matter"],
            "permissions": {"network": false, "pollSeconds": null},
            "htmlShim": null
        });

        assert_eq!(
            drop_unused_script_libraries(&mut body),
            vec!["dayjs".to_string(), "matter".to_string()]
        );
        assert_eq!(body["libraries"], serde_json::json!([]));
        assert!(validate_script_body_json(&body.to_string()).is_ok());
    }

    #[test]
    fn unused_library_accepts_matter_called() {
        let json = r#"{"source":"const engine = Matter.Engine.create(); Matter.Runner.run(engine);","libraries":["matter"],"permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    #[test]
    fn unused_library_accepts_mermaid_called() {
        let json = r#"{"source":"mermaid.initialize({startOnLoad:true}); mermaid.run();","libraries":["mermaid"],"permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    // --- delimiter-stripping internals --------------------------------------

    #[test]
    fn strip_treats_template_literal_as_opaque() {
        let out = strip_strings_and_comments("const s = `a {b} c`; foo();");
        // Inside the backticks the `{` and `}` should not appear in the
        // stripped output; the infinite-loop scan that consumes this view
        // must not see synthetic delimiters from inside template literals.
        assert!(!out.contains('{'));
        assert!(!out.contains('}'));
    }

    // --- AST-based parse / identifier scan ----------------------------------

    #[test]
    fn ast_rejects_grammar_error_that_passes_delimiter_balance() {
        // `const x = ;` has balanced delimiters but is not parseable. The
        // old heuristic accepted it because nothing was textually
        // unbalanced. The AST stage rejects it with a structured error.
        let body = serde_json::json!({
            "source": "const x = ;",
            "permissions": {"network": false},
        });
        let err = validate_script_body_json_detailed(&body.to_string())
            .expect_err("grammar error rejected");
        assert_eq!(err.0, ValidationError::InvalidScriptSource);
        let detail = err.1.unwrap();
        assert!(
            detail.contains("not parseable JavaScript"),
            "detail missing parse hint: {detail}",
        );
    }

    #[test]
    fn ast_rejects_double_identifier_declaration() {
        // `let x x = 5;` is delimiter-balanced and free of strings/comments,
        // so the heuristic accepted it. The AST rejects it as an unexpected
        // token.
        let body = serde_json::json!({
            "source": "let x x = 5;",
            "permissions": {"network": false},
        });
        let err = validate_script_body_json_detailed(&body.to_string())
            .expect_err("malformed decl rejected");
        assert_eq!(err.0, ValidationError::InvalidScriptSource);
    }

    #[test]
    fn ast_accepts_regex_literal_with_unbalanced_inner_paren() {
        // `/^foo\(/` has a literal `(` byte inside the regex. The old
        // heuristic strip pass did not understand regex literals and would
        // false-reject this; the AST stage knows it's a regex.
        let body = serde_json::json!({
            "source": "const re = /^foo\\(/; const m = re.test('foo(');",
            "permissions": {"network": false},
        });
        assert!(
            validate_script_body_json(&body.to_string()).is_ok(),
            "regex literal with unbalanced inner paren should parse cleanly",
        );
    }

    #[test]
    fn ast_detects_identifier_reference_inside_template_literal_interpolation() {
        // The heuristic blanks `${...}` content as part of the template
        // string, so a library referenced ONLY inside an interpolation was
        // wrongly flagged as unused. The AST walks into interpolation
        // expressions and sees the real reference.
        let body = serde_json::json!({
            "source": "const out = `engine: ${Matter.Engine.create()}`; document.getElementById('root').textContent = out;",
            "libraries": ["matter"],
            "permissions": {"network": false},
        });
        assert!(
            validate_script_body_json(&body.to_string()).is_ok(),
            "Matter referenced inside template interpolation must count as used",
        );
    }

    #[test]
    fn ast_top_level_return_is_legal_inside_widget_iiife() {
        // Widget sources are wrapped in `(function(){ source })()` at
        // runtime, so a bare `return` at widget top level is legal. The
        // validator wraps identically before parsing.
        let body = serde_json::json!({
            "source": "if (!document.getElementById('root')) return; document.getElementById('root').textContent = 'ok';",
            "permissions": {"network": false},
        });
        assert!(
            validate_script_body_json(&body.to_string()).is_ok(),
            "top-level return inside the synthetic IIFE wrapper should parse",
        );
    }

    #[test]
    fn drop_unused_libraries_falls_through_for_unparseable_source() {
        // If a sanitizer pass runs on unparseable source, it must not
        // mutate libraries — the storage validator will reject the source
        // itself with a precise error on the next round.
        let mut body = serde_json::json!({
            "source": "const x = ;",
            "libraries": ["matter"],
            "permissions": {"network": false, "pollSeconds": null},
            "htmlShim": null,
        });
        assert_eq!(drop_unused_script_libraries(&mut body), Vec::<String>::new());
        assert_eq!(body["libraries"], serde_json::json!(["matter"]));
    }

    // --- B1: lifecycle -------------------------------------------------------

    #[test]
    fn lifecycle_accepts_known_kinds_and_optional_min_tick() {
        for kind in ["static", "periodic", "animation", "realtime"] {
            let body = serde_json::json!({
                "source": "document.getElementById('root').textContent = 'ok';",
                "permissions": {"network": false},
                "lifecycle": {"kind": kind, "minTickMs": 33},
            });
            assert!(
                validate_script_body_json(&body.to_string()).is_ok(),
                "lifecycle.kind={kind} should validate",
            );
        }
    }

    #[test]
    fn lifecycle_rejects_unknown_kind() {
        let body = serde_json::json!({
            "source": "document.getElementById('root').textContent = 'ok';",
            "permissions": {"network": false},
            "lifecycle": {"kind": "perpetual", "minTickMs": null},
        });
        let err = validate_script_body_json_detailed(&body.to_string())
            .expect_err("unknown lifecycle kind rejected");
        assert_eq!(err.0, ValidationError::InvalidScriptBody);
    }

    #[test]
    fn lifecycle_rejects_min_tick_out_of_bounds() {
        for bad_tick in [0i64, 15, 60_001, 999_999] {
            let body = serde_json::json!({
                "source": "document.getElementById('root').textContent = 'ok';",
                "permissions": {"network": false},
                "lifecycle": {"kind": "animation", "minTickMs": bad_tick},
            });
            let err = validate_script_body_json_detailed(&body.to_string())
                .expect_err("out-of-bounds minTickMs rejected");
            assert_eq!(err.0, ValidationError::InvalidScriptBody, "{bad_tick}");
        }
    }

    #[test]
    fn lifecycle_absent_accepts_legacy_widget() {
        // Existing widgets in user databases have no lifecycle field. They
        // must continue to deserialize cleanly with lifecycle = None.
        let body = serde_json::json!({
            "source": "document.getElementById('root').textContent = 'ok';",
            "permissions": {"network": false},
        });
        let parsed = validate_script_body_json(&body.to_string())
            .expect("legacy script body without lifecycle is valid");
        assert!(parsed.lifecycle.is_none());
    }

    // --- B2: htmlShim caps + tag scan ---------------------------------------

    #[test]
    fn html_shim_size_cap_rejects_oversized_shim() {
        // Build a shim just past the 128 KB cap. Each "<div>" is 5 bytes,
        // so 27_000 copies produces ~135 KB.
        let oversized = "<div>".repeat(27_000);
        assert!(oversized.len() > MAX_HTML_SHIM_BYTES);
        let body = serde_json::json!({
            "source": "document.getElementById('mount').textContent = 'ok';",
            "permissions": {"network": false},
            "htmlShim": oversized,
        });
        let err = validate_script_body_json_detailed(&body.to_string())
            .expect_err("oversized shim rejected");
        assert_eq!(err.0, ValidationError::InvalidScriptSource);
        assert!(
            err.1.as_deref().unwrap_or("").contains("htmlShim"),
            "detail should mention htmlShim: {:?}",
            err.1,
        );
    }

    #[test]
    fn html_shim_size_cap_accepts_shim_under_128kb() {
        // A realistic large mount fragment (lots of layout divs) must fit
        // comfortably under the 128 KB ceiling.
        let big_but_valid = format!(
            "<div id=\"root\"><div class=\"scaffold\">{}</div></div>",
            "<div></div>".repeat(1_400),
        );
        assert!(big_but_valid.len() < MAX_HTML_SHIM_BYTES);
        let body = serde_json::json!({
            "source": "document.getElementById('root').dataset.ready = '1';",
            "permissions": {"network": false},
            "htmlShim": big_but_valid,
        });
        assert!(validate_script_body_json(&body.to_string()).is_ok());
    }

    #[test]
    fn html_shim_rejects_script_iframe_and_document_shell_tags() {
        for forbidden in [
            r#"<script>alert(1)</script>"#,
            r#"<iframe src='about:blank'></iframe>"#,
            r#"<object data='x'></object>"#,
            r#"<embed src='x'>"#,
            r#"<html><body><div id='root'></div></body></html>"#,
            r#"<head><meta charset='utf-8'></head>"#,
            r#"<link rel='stylesheet' href='x'>"#,
        ] {
            let body = serde_json::json!({
                "source": "document.getElementById('root').textContent = 'ok';",
                "permissions": {"network": false},
                "htmlShim": forbidden,
            });
            let err = validate_script_body_json_detailed(&body.to_string())
                .expect_err("forbidden tag rejected");
            assert_eq!(err.0, ValidationError::InvalidScriptSource, "{forbidden}");
            assert!(
                err.1.as_deref().unwrap_or("").contains("forbidden tag"),
                "detail should mention forbidden tag for {forbidden}: {:?}",
                err.1,
            );
        }
    }

    #[test]
    fn html_shim_accepts_normal_mount_fragments() {
        for ok in [
            r#"<div id="root"></div>"#,
            r#"<div id="root"><canvas id="canvas"></canvas></div>"#,
            r#"<section class="kk-shell"><div id="root"></div></section>"#,
            r#"<style>.kk-grid{gap:8px}</style><div id="root"></div>"#,
            // Token-boundary check: `<scripty` is not `<script`.
            r#"<div id="root"><scripty-x data-x="1"></scripty-x></div>"#,
        ] {
            let body = serde_json::json!({
                "source": "document.getElementById('root').textContent = 'ok';",
                "permissions": {"network": false},
                "htmlShim": ok,
            });
            assert!(
                validate_script_body_json(&body.to_string()).is_ok(),
                "shim should be accepted: {ok}",
            );
        }
    }

    #[test]
    fn secret_settings_values_must_be_references() {
        let schema = r#"{"fields":[{"type":"secret","key":"apiKey","label":"API key"}]}"#;
        assert_eq!(
            validate_settings_values_for_schema_json(
                schema,
                r#"{"apiKey":"plain-text"}"#,
                "inst-1"
            ),
            Err(ValidationError::InvalidSettingsValues),
        );
        assert!(validate_settings_values_for_schema_json(
            schema,
            r#"{"apiKey":{"type":"secretRef","ownerId":"dashboard-widget-secret:inst-1:apiKey","hasSecret":true}}"#,
            "inst-1",
        ).is_ok());
    }
}
