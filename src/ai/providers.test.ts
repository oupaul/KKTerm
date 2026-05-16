import { providerDefaultsFor, validateAiProviderForChat } from "./providers";

const copilotSettings = providerDefaultsFor("github-copilot");

try {
  validateAiProviderForChat(copilotSettings, false);
  throw new Error("GitHub Copilot should require device sign-in before chat.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("Connect GitHub Copilot")) {
    throw new Error(`GitHub Copilot should fail with the connection requirement, got: ${message}`);
  }
}

validateAiProviderForChat(copilotSettings, true);
