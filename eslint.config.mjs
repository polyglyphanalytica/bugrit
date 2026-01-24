import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import security from "eslint-plugin-security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // Next.js configuration
  ...compat.extends("next/core-web-vitals"),

  // Security plugin
  {
    plugins: {
      security,
    },
    rules: {
      // Security rules
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "warn",
    },
  },

  // TypeScript and React rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Prevent common mistakes
      "no-unused-vars": "off", // TypeScript handles this
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",

      // Best practices
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "warn",

      // React specific
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
      "worker/dist/**",
    ],
  },
];
