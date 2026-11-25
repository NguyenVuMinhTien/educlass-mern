import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/uploads/**",
      "**/node_modules/**",
      ".local/**",
      "client/public/assets/moments/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["server/**/*.js", "client/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["client/src/**/*.{js,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^[A-Z]", argsIgnorePattern: "^[A-Z_]" },
      ],
    },
  },
];
