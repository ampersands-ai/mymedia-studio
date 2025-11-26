import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.config.js", "*.config.ts"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // ═══════════════════════════════════════════════════
      // TYPESCRIPT STRICT RULES
      // ═══════════════════════════════════════════════════

      // Prevent `any` usage (upgraded to error)
      "@typescript-eslint/no-explicit-any": "error",

      // Require explicit return types on exported functions
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],

      // Require explicit return types on module boundaries
      "@typescript-eslint/explicit-module-boundary-types": ["warn", {
        allowArgumentsExplicitlyTypedAsAny: false,
      }],

      // Unused variables (keep as error)
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],

      // Prevent unsafe operations
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",

      // Require handling promises
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: { attributes: false },
      }],

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": ["warn", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      }],

      // Prevent non-null assertions (!.)
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Require await in async functions
      "@typescript-eslint/require-await": "warn",

      // Prevent unnecessary type assertions
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",

      // ═══════════════════════════════════════════════════
      // GENERAL BEST PRACTICES
      // ═══════════════════════════════════════════════════

      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/exhaustive-deps": "error",

      // Prefer const
      "prefer-const": "error",

      // No var
      "no-var": "error",

      // Consistent returns
      "consistent-return": "off",  // TypeScript handles this better
    },
  },
);
