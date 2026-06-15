use super::super::{
    OpenAiApiStyle, OpenAiAuthStyle, OpenAiCompatibleProvider, OpenAiEndpointStyle,
};

pub(super) fn provider() -> OpenAiCompatibleProvider {
    OpenAiCompatibleProvider {
        provider_kind: "nvidia",
        label: "NVIDIA",
        requires_api_key: true,
        endpoint_style: OpenAiEndpointStyle::ChatCompletions,
        auth_style: OpenAiAuthStyle::Bearer,
        // NVIDIA NIM exposes only the OpenAI /chat/completions endpoint, not the
        // Responses API (/responses returns HTTP 404), so it must default to
        // Chat Completions.
        default_api: OpenAiApiStyle::ChatCompletions,
    }
}
