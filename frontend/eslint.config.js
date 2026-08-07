import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      // set-state-in-effect fires on async .finally()/.then() callbacks inside
      // effects — those are standard async patterns, not the synchronous-setState
      // anti-pattern the rule targets.
      "react-hooks/set-state-in-effect": "off",

      // Vite HMR — warn when non-component values are exported from component files
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // TypeScript strictness
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // General quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Allow != null / == null — the idiomatic dual null+undefined check in TS.
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
    },
  },
);
