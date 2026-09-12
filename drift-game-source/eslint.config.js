import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        HTMLCanvasElement: "readonly",
        ImageData: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        Math: "readonly",
        Number: "readonly",
        String: "readonly",
        Boolean: "readonly",
        Array: "readonly",
        Object: "readonly",
        Set: "readonly",
        Map: "readonly",
        Float32Array: "readonly",
        Uint8Array: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "smart"],
    },
  },
  {
    // Architectural Boundary Rule: Core logic must remain 100% pure (no Three.js or DOM imports)
    files: ["src/core/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["three", "three/*", "*/render/*", "*/audio/*", "*/input/*"],
              message:
                "Architectural boundary violation: src/core/ must remain pure logic with zero Three.js, rendering, or audio dependencies.",
            },
          ],
        },
      ],
    },
  },
];
