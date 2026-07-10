import {
  selectModelOptionsForProvider,
  sortModelOptionsForProvider,
} from "./providerModelOptions";
import { defaultAiProviderSettings } from "../app-defaults";
import { getAiProviderDefinition } from "./providers";

const sorted = sortModelOptionsForProvider("openai", [
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { id: "gpt-5.4", label: "GPT-5.4" },
]).map((model) => model.id);

const expected = ["gpt-5.5", "gpt-5.4-mini", "gpt-5.4", "claude-sonnet-4.6"];

if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
  throw new Error(`Models should sort by label descending, got: ${sorted.join(", ")}`);
}

const source = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
];
const result = sortModelOptionsForProvider("ollama", source);

if (result === source) {
  throw new Error("Model sorting should not mutate or return the source list.");
}

const openAiDefinition = getAiProviderDefinition("openai");
if (openAiDefinition.defaultModel !== "gpt-5.6-luna") {
  throw new Error(`OpenAI should default to GPT-5.6 Luna, got: ${openAiDefinition.defaultModel}`);
}
if (defaultAiProviderSettings.model !== openAiDefinition.defaultModel) {
  throw new Error("Fresh-install and OpenAI provider defaults should stay aligned.");
}

const recommendedOpenAiModelIds = openAiDefinition.modelOptions
  .filter((model) => model.recommended)
  .map((model) => model.id);
for (const modelId of ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]) {
  if (!recommendedOpenAiModelIds.includes(modelId)) {
    throw new Error(`OpenAI curated models should include ${modelId}.`);
  }
}
if (recommendedOpenAiModelIds.some((modelId) => modelId.startsWith("gpt-5.5"))) {
  throw new Error("OpenAI curated models should no longer include GPT-5.5 models.");
}

const grokDefinition = getAiProviderDefinition("grok");
if (!grokDefinition.modelOptions.some((model) => model.id === "grok-4.5" && model.recommended)) {
  throw new Error("Grok curated models should include Grok 4.5.");
}

const curatedOpenAiModels = selectModelOptionsForProvider({
  customModel: "",
  provider: openAiDefinition,
  refreshedModels: [
    { id: "unlisted-lab-model", label: "Unlisted Lab Model" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  ],
  showAllModels: false,
});

if (curatedOpenAiModels.some((model) => model.id === "unlisted-lab-model")) {
  throw new Error("Curated model list should hide refreshed non-curated models.");
}

if (!curatedOpenAiModels.some((model) => model.id === "gpt-5.4-mini")) {
  throw new Error("Curated model list should include recommended provider defaults.");
}

const allOpenAiModels = selectModelOptionsForProvider({
  customModel: "",
  provider: openAiDefinition,
  refreshedModels: [
    { id: "unlisted-lab-model", label: "Unlisted Lab Model" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  ],
  showAllModels: true,
});

if (!allOpenAiModels.some((model) => model.id === "unlisted-lab-model")) {
  throw new Error("Show All Models should include refreshed non-curated models.");
}

const copilotDefinition = getAiProviderDefinition("github-copilot");
const copilotModels = selectModelOptionsForProvider({
  customModel: "",
  provider: copilotDefinition,
  refreshedModels: [
    { id: "account-enabled-model", label: "Account Enabled Model" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { id: "gpt-5.1-mini", label: "GPT-5.1 Mini" },
  ],
  showAllModels: false,
});

if (!copilotModels.some((model) => model.id === "auto")) {
  throw new Error("GitHub Copilot model selectors should include Auto.");
}

if (copilotModels.some((model) => model.id === "account-enabled-model")) {
  throw new Error("GitHub Copilot should hide refreshed account models that are not curated.");
}

if (!copilotModels.some((model) => model.id === "gpt-5.1-mini")) {
  throw new Error("GitHub Copilot should show curated models that are available to the signed-in account.");
}

if (copilotModels.some((model) => model.id === "gpt-5.5")) {
  throw new Error("GitHub Copilot should not show stale curated models after account models refresh.");
}

const customModelOptions = selectModelOptionsForProvider({
  customModel: "my-private-model",
  provider: openAiDefinition,
  refreshedModels: [],
  showAllModels: false,
});

if (customModelOptions[0]?.id !== "my-private-model") {
  throw new Error("Custom model IDs should appear in model selectors even when Show All is off.");
}
