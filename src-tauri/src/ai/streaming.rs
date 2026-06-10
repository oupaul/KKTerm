#[allow(unused_imports)]
use super::*;
use super::{ai_debug, ai_interaction_debug};

#[derive(Deserialize, Default)]
pub(crate) struct ChatSseChunk {
    pub(crate) choices: Vec<ChatSseChoice>,
}

#[derive(Deserialize, Default)]
pub(crate) struct ChatSseChoice {
    pub(crate) delta: ChatSseDelta,
    #[serde(default)]
    pub(crate) finish_reason: Option<String>,
}

#[derive(Deserialize, Default)]
pub(crate) struct ChatSseDelta {
    #[serde(default)]
    pub(crate) content: Option<String>,
    #[serde(default)]
    pub(crate) reasoning_content: Option<String>,
    #[serde(default)]
    pub(crate) reasoning: Option<String>,
    #[serde(default)]
    pub(crate) reasoning_details: Vec<ReasoningDetail>,
    #[serde(default)]
    pub(crate) tool_calls: Vec<SseToolCallDelta>,
}

#[derive(Deserialize, Default)]
pub(crate) struct ReasoningDetail {
    #[serde(default)]
    pub(crate) summary: Option<String>,
    #[serde(default)]
    pub(crate) text: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct SseToolCallDelta {
    index: u32,
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    function: Option<SseToolCallFunctionDelta>,
}

#[derive(Deserialize, Default)]
pub(crate) struct SseToolCallFunctionDelta {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    arguments: Option<String>,
}

#[derive(Default)]
pub(crate) struct ToolCallAccumulator {
    id: String,
    name: String,
    arguments: String,
}

pub(crate) fn ai_http_client(allow_insecure_tls: bool) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(allow_insecure_tls)
        .build()
        .map_err(|error| format!("failed to configure AI HTTP client: {error}"))
}

pub(crate) fn log_provider_request<T: Serialize>(
    api: &str,
    provider_kind: &str,
    model: &str,
    turn_index: usize,
    endpoint: &str,
    body: &T,
) {
    let body_value = serde_json::to_value(body).unwrap_or(Value::Null);
    let item_summary = summarize_request_items(&body_value);
    ai_interaction_debug!(
        "provider.request",
        json!({
            "api": api,
            "providerKind": provider_kind,
            "model": model,
            "turn": turn_index,
            "endpoint": endpoint,
            "itemSummary": item_summary,
            "body": body_value,
        })
    );
}

/// Per-boundary diagnostics: for each top-level item the harness sends to the
/// provider, log `type`, `role`, and approximate size. This catches malformed
/// items (e.g. an `output_text` content part leaked to the top level) before
/// the provider rejects the request with an opaque enum-only 400.
pub(crate) fn summarize_request_items(body: &Value) -> Vec<Value> {
    let array = body
        .get("input")
        .or_else(|| body.get("messages"))
        .and_then(Value::as_array);
    let Some(items) = array else {
        return Vec::new();
    };
    items
        .iter()
        .enumerate()
        .map(|(index, item)| {
            let type_str = item.get("type").and_then(Value::as_str);
            let role = item.get("role").and_then(Value::as_str);
            let content_parts: Vec<&str> = item
                .get("content")
                .and_then(Value::as_array)
                .map(|parts| {
                    parts
                        .iter()
                        .filter_map(|part| part.get("type").and_then(Value::as_str))
                        .collect()
                })
                .unwrap_or_default();
            let approx_bytes = serde_json::to_string(item)
                .map(|s| s.len())
                .unwrap_or_default();
            json!({
                "index": index,
                "type": type_str,
                "role": role,
                "contentParts": content_parts,
                "approxBytes": approx_bytes,
            })
        })
        .collect()
}

pub(crate) fn log_provider_response(
    api: &str,
    provider_kind: &str,
    model: &str,
    turn_index: usize,
    status: u16,
    body: &str,
) {
    ai_interaction_debug!(
        "provider.response",
        json!({
            "api": api,
            "providerKind": provider_kind,
            "model": model,
            "turn": turn_index,
            "status": status,
            "body": body,
        })
    );
}

#[derive(Default)]
pub(crate) struct ResponsesStreamState {
    pub(crate) content: Option<String>,
    reasoning: String,
    tool_call_items: HashMap<String, ResponsesStreamToolCall>,
    tool_call_order: Vec<String>,
}

pub(crate) struct ResponsesStreamToolCall {
    call_id: String,
    name: String,
    arguments: String,
}

#[derive(Default)]
pub(crate) struct ResponsesStreamDeltas {
    pub(crate) content_delta: Option<String>,
    pub(crate) reasoning_delta: Option<String>,
}

impl ResponsesStreamState {
    fn append_content(&mut self, delta: &str) {
        if delta.is_empty() {
            return;
        }
        self.content = Some(
            self.content
                .take()
                .unwrap_or_default()
                .chars()
                .chain(delta.chars())
                .collect(),
        );
    }

    pub(crate) fn into_tool_calls(self) -> Vec<OpenAiToolCall> {
        let mut items = self.tool_call_items;
        let mut tool_calls = Vec::new();
        for item_id in self.tool_call_order {
            let Some(item) = items.remove(&item_id) else {
                continue;
            };
            if !item.name.is_empty() && !item.call_id.is_empty() {
                tool_calls.push(OpenAiToolCall {
                    id: item.call_id,
                    function: OpenAiToolCallFunction {
                        name: item.name,
                        arguments: item.arguments,
                    },
                });
            }
        }
        tool_calls
    }
}

pub(crate) fn append_completed_responses_text(state: &mut ResponsesStreamState, text: &str) -> Option<String> {
    let text = text.trim();
    if text.is_empty() {
        return None;
    }

    match state.content.as_deref() {
        Some(current) if current == text => None,
        Some(current) if text.starts_with(current) => {
            let delta = text[current.len()..].to_string();
            state.append_content(&delta);
            (!delta.is_empty()).then_some(delta)
        }
        Some(_) => None,
        None => {
            state.append_content(text);
            Some(text.to_string())
        }
    }
}

pub(crate) fn append_completed_responses_message_text(
    state: &mut ResponsesStreamState,
    item: &Value,
) -> Option<String> {
    if item.get("type").and_then(Value::as_str) != Some("message") {
        return None;
    }
    let text = item
        .get("content")
        .and_then(Value::as_array)
        .map(|content| {
            content
                .iter()
                .filter_map(|part| match part.get("type").and_then(Value::as_str) {
                    Some("output_text") => part.get("text").and_then(Value::as_str),
                    Some("refusal") => part.get("refusal").and_then(Value::as_str),
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join("\n")
        })?
        .trim()
        .to_string();
    append_completed_responses_text(state, &text)
}

pub(crate) fn apply_responses_stream_event(
    state: &mut ResponsesStreamState,
    event: &Value,
) -> ResponsesStreamDeltas {
    let mut deltas = ResponsesStreamDeltas::default();
    let event_type = event.get("type").and_then(Value::as_str).unwrap_or("");

    match event_type {
        "response.output_text.delta" => {
            if let Some(delta) = event.get("delta").and_then(Value::as_str) {
                if !delta.is_empty() {
                    state.append_content(delta);
                    deltas.content_delta = Some(delta.to_string());
                }
            }
        }
        "response.output_text.done" => {
            if let Some(text) = event.get("text").and_then(Value::as_str) {
                deltas.content_delta = append_completed_responses_text(state, text);
            }
        }
        "response.refusal.delta" => {
            if let Some(delta) = event.get("delta").and_then(Value::as_str) {
                if !delta.is_empty() {
                    state.append_content(delta);
                    deltas.content_delta = Some(delta.to_string());
                }
            }
        }
        "response.refusal.done" => {
            if let Some(refusal) = event.get("refusal").and_then(Value::as_str) {
                deltas.content_delta = append_completed_responses_text(state, refusal);
            }
        }
        "response.reasoning_text.delta" | "response.reasoning_summary_text.delta" => {
            if let Some(delta) = event.get("delta").and_then(Value::as_str) {
                if !delta.is_empty() {
                    state.reasoning.push_str(delta);
                    deltas.reasoning_delta = Some(delta.to_string());
                }
            }
        }
        "response.reasoning_text.done" | "response.reasoning_summary_text.done" => {
            if let Some(text) = event.get("text").and_then(Value::as_str) {
                let text = text.trim();
                if !text.is_empty() && !state.reasoning.contains(text) {
                    state.reasoning.push_str(text);
                    deltas.reasoning_delta = Some(text.to_string());
                }
            }
        }
        "response.completed" => {
            if let Some(response) = event.get("response") {
                if let Some(items) = response.get("output").and_then(Value::as_array) {
                    let mut content_delta = String::new();
                    for item in items {
                        if let Some(delta) = append_completed_responses_message_text(state, item) {
                            content_delta.push_str(&delta);
                        }
                    }
                    if !content_delta.is_empty() {
                        deltas.content_delta = Some(content_delta);
                    }
                }
                if let Some(text) = extract_responses_reasoning_text(response) {
                    let text = text.trim();
                    if !text.is_empty() && !state.reasoning.contains(text) {
                        state.reasoning.push_str(text);
                        deltas.reasoning_delta = Some(text.to_string());
                    }
                }
            }
        }
        "response.output_item.added" => {
            if let Some(item) = event.get("item") {
                if item.get("type").and_then(Value::as_str) == Some("function_call") {
                    let item_id = item
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    if item_id.is_empty() {
                        return deltas;
                    }
                    let call_id = item
                        .get("call_id")
                        .or_else(|| item.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let name = item
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    if !state.tool_call_items.contains_key(&item_id) {
                        state.tool_call_order.push(item_id.clone());
                    }
                    state.tool_call_items.insert(
                        item_id,
                        ResponsesStreamToolCall {
                            call_id,
                            name,
                            arguments: String::new(),
                        },
                    );
                }
            }
        }
        "response.output_item.done" => {
            if let Some(item) = event.get("item") {
                deltas.content_delta = append_completed_responses_message_text(state, item);
            }
        }
        "response.function_call_arguments.delta" => {
            let item_id = event
                .get("item_id")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            if let Some(delta) = event.get("delta").and_then(Value::as_str) {
                if let Some(entry) = state.tool_call_items.get_mut(&item_id) {
                    entry.arguments.push_str(delta);
                }
            }
        }
        "response.function_call_arguments.done" => {
            let item_id = event
                .get("item_id")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            if let Some(arguments) = event.get("arguments").and_then(Value::as_str) {
                if let Some(entry) = state.tool_call_items.get_mut(&item_id) {
                    entry.arguments = arguments.to_string();
                }
            }
        }
        _ => {}
    }

    deltas
}

pub(crate) fn sse_field_value<'a>(line: &'a str, field_name: &str) -> Option<&'a str> {
    let (name, value) = line.split_once(':')?;
    if name != field_name {
        return None;
    }
    Some(value.strip_prefix(' ').unwrap_or(value))
}

pub(crate) fn emit_stream(channel: &Channel<Value>, event: &AiStreamEvent) -> Result<(), String> {
    let value = serde_json::to_value(event).map_err(|e| e.to_string())?;
    ai_interaction_debug!("stream.emit", value.clone());
    channel
        .send(value)
        .map_err(|e| format!("failed to send stream event: {e}"))
}

pub(crate) async fn stream_chat_completions(
    response: reqwest::Response,
    channel: &Channel<Value>,
) -> Result<(String, Vec<OpenAiToolCall>, Option<String>), String> {
    let mut content = String::new();
    let mut reasoning = String::new();
    let mut tool_call_builders: HashMap<u32, ToolCallAccumulator> = HashMap::new();

    let mut stream = response.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("stream read error: {e}"))?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(nl) = buf.find('\n') {
            let line = buf[..nl].trim().to_string();
            buf = buf[nl + 1..].to_string();
            if line.is_empty() || line.starts_with(':') {
                continue;
            }
            let data = match line.strip_prefix("data: ") {
                Some(d) => d,
                None => continue,
            };
            if data == "[DONE]" {
                ai_interaction_debug!(
                    "provider.stream_data",
                    json!({ "api": "chat_completions", "data": data })
                );
                break;
            }
            ai_interaction_debug!(
                "provider.stream_data",
                json!({ "api": "chat_completions", "data": data })
            );
            let chunk: ChatSseChunk =
                serde_json::from_str(data).map_err(|e| format!("SSE parse error: {e}"))?;
            for choice in chunk.choices {
                if let Some(finish_reason) = choice.finish_reason.as_deref() {
                    ai_debug!("chat stream finish_reason={finish_reason}");
                }
                if let Some(c) = choice.delta.content.as_deref() {
                    if !c.is_empty() {
                        content.push_str(c);
                        emit_stream(
                            channel,
                            &AiStreamEvent::ContentDelta {
                                delta: c.to_string(),
                            },
                        )?;
                    }
                }
                if let Some(r) = chat_sse_delta_reasoning(&choice.delta) {
                    if !r.is_empty() {
                        reasoning.push_str(&r);
                        emit_stream(channel, &AiStreamEvent::ReasoningDelta { delta: r })?;
                    }
                }
                for tc in &choice.delta.tool_calls {
                    let acc = tool_call_builders.entry(tc.index).or_default();
                    if let Some(id) = &tc.id {
                        acc.id.clone_from(id);
                    }
                    if let Some(ref f) = tc.function {
                        if let Some(name) = &f.name {
                            acc.name.clone_from(name);
                        }
                        if let Some(args) = &f.arguments {
                            acc.arguments.push_str(args);
                        }
                    }
                }
            }
        }
    }

    let mut tool_calls: Vec<OpenAiToolCall> = Vec::new();
    let mut indexes: Vec<u32> = tool_call_builders.keys().copied().collect();
    indexes.sort();
    for idx in indexes {
        if let Some(acc) = tool_call_builders.remove(&idx) {
            if !acc.name.is_empty() {
                tool_calls.push(OpenAiToolCall {
                    id: acc.id,
                    function: OpenAiToolCallFunction {
                        name: acc.name,
                        arguments: acc.arguments,
                    },
                });
            }
        }
    }

    let reasoning_content = reasoning
        .trim()
        .is_empty()
        .then(|| None)
        .unwrap_or(Some(reasoning));

    Ok((content, tool_calls, reasoning_content))
}

pub(crate) async fn stream_responses_completions(
    response: reqwest::Response,
    channel: &Channel<Value>,
) -> Result<(Option<String>, Vec<OpenAiToolCall>, Option<String>), String> {
    let mut state = ResponsesStreamState::default();
    let mut current_event = String::new();

    let mut stream = response.bytes_stream();
    let mut buf = String::new();
    let mut body = String::new();
    let mut saw_sse_data = false;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("stream read error: {e}"))?;
        let chunk = String::from_utf8_lossy(&chunk);
        body.push_str(&chunk);
        buf.push_str(&chunk);

        while let Some(nl) = buf.find('\n') {
            let line = buf[..nl].trim().to_string();
            buf = buf[nl + 1..].to_string();

            if let Some(event_name) = sse_field_value(&line, "event") {
                current_event = event_name.trim().to_string();
                continue;
            }

            let data = match sse_field_value(&line, "data") {
                Some(d) => d,
                None => continue,
            };
            saw_sse_data = true;
            if data == "[DONE]" {
                ai_interaction_debug!(
                    "provider.stream_data",
                    json!({ "api": "responses", "event": current_event.clone(), "data": data })
                );
                break;
            }
            ai_interaction_debug!(
                "provider.stream_data",
                json!({ "api": "responses", "event": current_event.clone(), "data": data })
            );

            let event: Value =
                serde_json::from_str(data).map_err(|e| format!("SSE parse error: {e}"))?;
            if let Some(message) = responses_stream_error_message(&event) {
                return Err(message);
            }

            let deltas = apply_responses_stream_event(&mut state, &event);
            if let Some(delta) = deltas.content_delta {
                emit_stream(channel, &AiStreamEvent::ContentDelta { delta })?;
            }
            if let Some(delta) = deltas.reasoning_delta {
                emit_stream(channel, &AiStreamEvent::ReasoningDelta { delta })?;
            }

            current_event.clear();
        }
    }

    let trailing_line = buf.trim();
    if !trailing_line.is_empty() {
        if let Some(data) = sse_field_value(trailing_line, "data") {
            saw_sse_data = true;
            if data != "[DONE]" {
                ai_interaction_debug!(
                    "provider.stream_data",
                    json!({ "api": "responses", "event": current_event.clone(), "data": data })
                );
                let event: Value =
                    serde_json::from_str(data).map_err(|e| format!("SSE parse error: {e}"))?;
                if let Some(message) = responses_stream_error_message(&event) {
                    return Err(message);
                }
                let deltas = apply_responses_stream_event(&mut state, &event);
                if let Some(delta) = deltas.content_delta {
                    emit_stream(channel, &AiStreamEvent::ContentDelta { delta })?;
                }
                if let Some(delta) = deltas.reasoning_delta {
                    emit_stream(channel, &AiStreamEvent::ReasoningDelta { delta })?;
                }
            }
        }
    }

    if !saw_sse_data {
        return parse_non_sse_responses_stream_body(&body);
    }

    let content = state.content.clone();
    let reasoning_content = state
        .reasoning
        .trim()
        .is_empty()
        .then(|| None)
        .unwrap_or(Some(state.reasoning.clone()));
    let tool_calls = state.into_tool_calls();

    Ok((content, tool_calls, reasoning_content))
}
