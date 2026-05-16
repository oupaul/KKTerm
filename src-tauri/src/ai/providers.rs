// Provider adapters live in one file per provider; Rust still requires this explicit module registry.
mod azure_openai;
mod deepseek;
mod gemini;
mod grok;
mod litellm;
mod nvidia;
mod ollama;
mod openai;
mod openai_compatible;
mod openrouter;

use super::{AgentProviderAdapter, GitHubCopilotProvider};

pub(super) fn provider_for(kind: &str) -> Result<AgentProviderAdapter, String> {
    match kind {
        "azure-openai" => Ok(AgentProviderAdapter::OpenAi(azure_openai::provider())),
        "deepseek" => Ok(AgentProviderAdapter::OpenAi(deepseek::provider())),
        "gemini" => Ok(AgentProviderAdapter::OpenAi(gemini::provider())),
        "grok" => Ok(AgentProviderAdapter::OpenAi(grok::provider())),
        "litellm" => Ok(AgentProviderAdapter::OpenAi(litellm::provider())),
        "openai" => Ok(AgentProviderAdapter::OpenAi(openai::provider())),
        "openrouter" => Ok(AgentProviderAdapter::OpenAi(openrouter::provider())),
        "ollama" => Ok(AgentProviderAdapter::OpenAi(ollama::provider())),
        "nvidia" => Ok(AgentProviderAdapter::OpenAi(nvidia::provider())),
        "openai-compatible" => Ok(AgentProviderAdapter::OpenAi(openai_compatible::provider())),
        "anthropic" => Err(
            "Anthropic support needs a provider adapter; DeepSeek and OpenAI-compatible providers are wired first."
                .to_string(),
        ),
        "github-copilot" => Ok(AgentProviderAdapter::GitHubCopilot(GitHubCopilotProvider)),
        _ => Err("AI provider is not supported by the agent runner".to_string()),
    }
}
