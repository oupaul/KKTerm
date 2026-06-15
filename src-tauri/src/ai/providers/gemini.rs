use super::super::{
    OpenAiApiStyle, OpenAiAuthStyle, OpenAiCompatibleProvider, OpenAiEndpointStyle,
};

pub(super) fn provider() -> OpenAiCompatibleProvider {
    OpenAiCompatibleProvider {
        provider_kind: "gemini",
        label: "Google Gemini",
        requires_api_key: true,
        endpoint_style: OpenAiEndpointStyle::ChatCompletions,
        auth_style: OpenAiAuthStyle::Bearer,
        // Gemini's OpenAI-compatibility layer implements /chat/completions but
        // not the OpenAI Responses API (/responses returns HTTP 404), so it must
        // default to Chat Completions.
        default_api: OpenAiApiStyle::ChatCompletions,
    }
}
