import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "eslint-plugin-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react/no-unescaped-entities": "off",
    },
  },
  {
    ignores: [".next/", "node_modules/", "storage/", "*.config.js"],
  }
);