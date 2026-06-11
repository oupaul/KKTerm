// Pure generation logic for the Password Generator widget.
// Randomness comes from crypto.getRandomValues with rejection sampling so
// every character pick is unbiased.

export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const DIGITS = "0123456789";
export const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
}

// Short, common, unambiguous words for memorable passphrases.
export const PASSPHRASE_WORDS = [
  "acorn", "amber", "anchor", "apple", "arrow", "atlas", "autumn", "badge",
  "bamboo", "basil", "beacon", "berry", "birch", "bishop", "blade", "blossom",
  "breeze", "brick", "bridge", "bronze", "butter", "cabin", "candle", "canyon",
  "carbon", "castle", "cedar", "cherry", "circle", "citrus", "clover", "cobalt",
  "comet", "copper", "coral", "cotton", "crane", "cricket", "crystal", "daisy",
  "dawn", "delta", "denim", "desert", "dolphin", "donkey", "dragon", "drift",
  "eagle", "ember", "engine", "falcon", "feather", "fern", "field", "flame",
  "flint", "forest", "fossil", "fox", "frost", "garden", "garnet", "ginger",
  "glacier", "globe", "grape", "granite", "gravel", "grove", "harbor", "hazel",
  "heron", "hill", "honey", "horizon", "island", "ivory", "jade", "jasmine",
  "jungle", "juniper", "kayak", "kettle", "lagoon", "lantern", "laurel", "lemon",
  "lily", "linen", "lunar", "magnet", "maple", "marble", "meadow", "mesa",
  "mint", "mirror", "monsoon", "moss", "mountain", "nectar", "north", "oasis",
  "ocean", "olive", "onyx", "orchid", "otter", "owl", "panda", "paper",
  "pebble", "penguin", "pepper", "pine", "planet", "plum", "pond", "poplar",
  "prairie", "prism", "quartz", "quill", "rabbit", "raven", "reef", "ridge",
  "river", "robin", "rocket", "rose", "saffron", "sage", "salmon", "sand",
  "sapphire", "shadow", "shell", "silver", "sky", "slate", "smoke", "spark",
  "spice", "spring", "spruce", "stone", "storm", "summit", "sunset", "swan",
  "thunder", "tiger", "timber", "topaz", "torch", "trail", "tulip", "tundra",
  "valley", "velvet", "violet", "walnut", "wave", "willow", "winter", "zephyr",
] as const;

/** Unbiased random integer in [0, max). */
function randomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  // Rejection sampling: retry the rare draws that would bias the modulo.
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

function pick(pool: string): string {
  return pool[randomIndex(pool.length)];
}

export function characterPool(options: PasswordOptions): string {
  let pool = LOWERCASE;
  if (options.uppercase) pool += UPPERCASE;
  if (options.digits) pool += DIGITS;
  if (options.symbols) pool += SYMBOLS;
  return pool;
}

export function generatePassword(options: PasswordOptions): string {
  const pool = characterPool(options);
  const required: string[] = [pick(LOWERCASE)];
  if (options.uppercase) required.push(pick(UPPERCASE));
  if (options.digits) required.push(pick(DIGITS));
  if (options.symbols) required.push(pick(SYMBOLS));

  const length = Math.max(options.length, required.length);
  const chars: string[] = [];
  for (let i = 0; i < length - required.length; i++) {
    chars.push(pick(pool));
  }
  // Insert the guaranteed class representatives at random positions.
  for (const char of required) {
    chars.splice(randomIndex(chars.length + 1), 0, char);
  }
  return chars.join("");
}

export function generatePassphrase(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(PASSPHRASE_WORDS[randomIndex(PASSPHRASE_WORDS.length)]);
  }
  return words.join("-");
}

export function passwordEntropyBits(options: PasswordOptions): number {
  return Math.round(options.length * Math.log2(characterPool(options).length));
}

export function passphraseEntropyBits(wordCount: number): number {
  return Math.round(wordCount * Math.log2(PASSPHRASE_WORDS.length));
}

export type StrengthTier = "weak" | "fair" | "strong" | "excellent";

export function strengthTier(bits: number): StrengthTier {
  if (bits < 50) return "weak";
  if (bits < 70) return "fair";
  if (bits < 90) return "strong";
  return "excellent";
}
