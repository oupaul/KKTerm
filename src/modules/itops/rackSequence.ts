import type { RackInput } from "./state";

export const RACK_SEQUENCE_TOKEN = "%02d";

export interface RackPlacementSequence {
  template: string;
  input: Omit<RackInput, "name">;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasRackSequenceToken(template: string) {
  return template.includes(RACK_SEQUENCE_TOKEN);
}

/** Resolve the next name for a Java-style two-digit Rack sequence template.
 *  Only names matching the template's prefix and suffix participate. */
export function nextRackSequenceName(template: string, existingNames: Iterable<string>) {
  const tokenIndex = template.indexOf(RACK_SEQUENCE_TOKEN);
  if (tokenIndex < 0) return template;

  const prefix = template.slice(0, tokenIndex);
  const suffix = template.slice(tokenIndex + RACK_SEQUENCE_TOKEN.length);
  const matcher = new RegExp(`^${escapeRegExp(prefix)}(\\d+)${escapeRegExp(suffix)}$`);
  let highest = 0;
  for (const name of existingNames) {
    const match = matcher.exec(name);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(value)) highest = Math.max(highest, value);
  }

  return `${prefix}${String(highest + 1).padStart(2, "0")}${suffix}`;
}
