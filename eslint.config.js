import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// Flat ESLint config for the React/TypeScript frontend.
//
// Philosophy: the gate must be GREEN on the current code so it can block merges
// on *new* problems. Correctness rules (hooks, unreachable code, duplicate
// keys) are errors; pre-existing stylistic noise is downgraded to warn so the
// gate is meaningful without a one-time churn wall. Tighten over time.
export default tseslint.config(
  {
    ignores: [
      "dist",
      "src-tauri",
      "scripts",
      "tests",
      "public",
      "*.config.{js,ts}",
      "src/**/*.bundle.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Correctness — keep as errors so CI fails on regressions.
      "react-hooks/rules-of-hooks": "error",

      // Pre-existing noise in a large, fast-moving codebase — visible but
      // non-blocking until burned down. Serious js.recommended rules
      // (no-undef, no-dupe-keys, no-unreachable, no-fallthrough, …) stay
      // errors, so the gate still fails on genuinely broken new code.
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-case-declarations": "warn",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "preserve-caught-error": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
);
