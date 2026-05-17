import {
  displayNameForModelOption,
  selectModelOptionsForProvider,
  sortModelOptionsForProvider,
} from "./providerModelOptions";
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

const customModelOptions = selectModelOptionsForProvider({
  customModel: "my-private-model",
  provider: openAiDefinition,
  refreshedModels: [],
  showAllModels: false,
});

if (customModelOptions[0]?.id !== "my-private-model") {
  throw new Error("Custom model IDs should appear in model selectors even when Show All is off.");
}

const recommendedLabel = displayNameForModelOption(
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", recommended: true },
  "Recommended",
);

if (recommendedLabel !== "GPT-5.4 Mini - Recommended") {
  throw new Error(`Recommended model labels should be marked, got: ${recommendedLabel}`);
}
