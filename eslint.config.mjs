import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Ignore patterns (must be first for flat config)
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
      "*.config.ts",
      "worker/**",
      "functions/**",
      "public/**",
      "scripts/**",
      "next-env.d.ts",
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended (includes parser setup)
  ...tseslint.configs.recommended,

  // Next.js plugin rules
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // React hooks
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Security plugin
  {
    plugins: {
      security,
    },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "warn",
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
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      "no-debugger": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-case-declarations": "off",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-empty": "warn",
    },
  },
);
