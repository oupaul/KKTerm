use super::super::{
    OpenAiApiStyle, OpenAiAuthStyle, OpenAiCompatibleProvider, OpenAiEndpointStyle,
};

pub(super) fn provider() -> OpenAiCompatibleProvider {
    OpenAiCompatibleProvider {
        provider_kind: "ollama-cloud",
        label: "Ollama Cloud",
        requires_api_key: true,
        endpoint_style: OpenAiEndpointStyle::ChatCompletions,
        auth_style: OpenAiAuthStyle::Bearer,
        // ollama.com acts as a remote Ollama host reached over the
        // OpenAI-compatible /v1 layer. The cloud host is not documented to
        // implement the Responses API, so default to Chat Completions, which is
        // the universally supported endpoint.
        default_api: OpenAiApiStyle::ChatCompletions,
    }
}
