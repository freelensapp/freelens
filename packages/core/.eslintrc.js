/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const packageJson = require("./package.json");

module.exports = {
  ignorePatterns: [
    "**/node_modules/**/*",
    "**/dist/**/*",
    "**/static/**/*",
    "**/site/**/*",
    "**/build/webpack/**/*",
  ],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
    },
    react: {
      version: packageJson.devDependencies.react || "detect",
    },
  },
  overrides: [
    {
      files: ["**/*.js", "**/*.mjs"],
      extends: ["eslint:recommended"],
      env: {
        node: true,
        es2022: true,
      },
      parserOptions: {
        sourceType: "module",
      },
      plugins: ["header", "unused-imports", "react-hooks"],
      rules: {
        "comma-dangle": ["error", "always-multiline"],
        "comma-spacing": "error",
        "eol-last": ["error", "always"],
        indent: [
          "error",
          2,
          {
            SwitchCase: 1,
          },
        ],
        "linebreak-style": ["error", "unix"],
        "no-constant-condition": [
          "error",
          {
            checkLoops: false,
          },
        ],
        "no-template-curly-in-string": "error",
        "no-unused-expressions": "error",
        "no-unused-vars": "off",
        "object-curly-spacing": [
          "error",
          "always",
          {
            arraysInObjects: true,
            objectsInObjects: false,
          },
        ],
        "object-shorthand": "error",
        "padding-line-between-statements": [
          "error",
          {
            blankLine: "always",
            next: "return",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "block-like",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "function",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "class",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "*",
            prev: ["const", "let", "var"],
          },
          {
            blankLine: "any",
            next: ["const", "let", "var"],
            prev: ["const", "let", "var"],
          },
        ],
        "prefer-template": "error",
        quotes: [
          "error",
          "double",
          {
            allowTemplateLiterals: true,
            avoidEscape: true,
          },
        ],
        semi: ["error", "always"],
        "space-before-function-paren": [
          "error",
          {
            anonymous: "always",
            asyncArrow: "always",
            named: "never",
          },
        ],
        "template-curly-spacing": "error",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
          "warn",
          {
            args: "after-used",
            ignoreRestSiblings: true,
            vars: "all",
          },
        ],
      },
    },
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
      ],
      plugins: ["header", "unused-imports", "react-hooks"],
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
      },
      rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-ts-ignore": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/consistent-type-definitions": [
          "error",
          "interface",
        ],
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/naming-convention": [
          "error",
          {
            custom: {
              match: false,
              regex: "^Props$",
            },
            format: ["PascalCase"],
            leadingUnderscore: "forbid",
            selector: "interface",
            trailingUnderscore: "forbid",
          },
          {
            custom: {
              match: false,
              regex: "^(Props|State)$",
            },
            format: ["PascalCase"],
            leadingUnderscore: "forbid",
            selector: "typeAlias",
            trailingUnderscore: "forbid",
          },
        ],
        "@typescript-eslint/no-duplicate-enum-values": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-invalid-this": ["error"],
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "off",
        "comma-spacing": "off",
        "comman-dangle": "off",
        "eol-last": ["error", "always"],
        "import/no-named-as-default": 0,
        "import/no-named-as-default-member": "off",
        "import/prefer-default-export": "off",
        indent: [
          "error",
          2,
          {
            SwitchCase: 1,
          },
        ],
        "linebreak-style": ["error", "unix"],
        "no-constant-condition": [
          "error",
          {
            checkLoops: false,
          },
        ],
        "no-invalid-this": "off",
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                message:
                  "No importing from local index.ts(x?) file. A common way to make circular dependencies.",
                name: ".",
              },
            ],
          },
        ],
        "no-template-curly-in-string": "error",
        "no-unused-expressions": "off",
        "object-curly-spacing": "off",
        "object-shorthand": "error",
        "padding-line-between-statements": [
          "error",
          {
            blankLine: "always",
            next: "return",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "block-like",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "function",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "class",
            prev: "*",
          },
          {
            blankLine: "always",
            next: "*",
            prev: ["const", "let", "var"],
          },
          {
            blankLine: "any",
            next: ["const", "let", "var"],
            prev: ["const", "let", "var"],
          },
        ],
        "prefer-template": "error",
        quotes: [
          "error",
          "double",
          {
            allowTemplateLiterals: true,
            avoidEscape: true,
          },
        ],
        "react-hooks/exhaustive-deps": "off",
        "react/display-name": "off",
        "react/jsx-closing-tag-location": "error",
        "react/jsx-first-prop-new-line": ["error", "multiline"],
        "react/jsx-indent": ["error", 2],
        "react/jsx-indent-props": ["error", 2],
        "react/jsx-max-props-per-line": [
          "error",
          {
            maximum: {
              multi: 1,
              single: 2,
            },
          },
        ],
        "react/jsx-one-expression-per-line": [
          "error",
          {
            allow: "single-child",
          },
        ],
        "react/jsx-wrap-multilines": [
          "error",
          {
            arrow: "parens-new-line",
            assignment: "parens-new-line",
            condition: "parens-new-line",
            declaration: "parens-new-line",
            logical: "parens-new-line",
            prop: "parens-new-line",
            return: "parens-new-line",
          },
        ],
        "react/prop-types": "off",
        semi: "off",
        "space-before-function-paren": "off",
        "template-curly-spacing": "error",
      },
    },
    {
      files: [
        "src/{common,main,renderer}/**/*.ts",
        "src/{common,main,renderer}/**/*.tsx",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                message:
                  "No importing from local index.ts(x?) file. A common way to make circular dependencies.",
                name: ".",
              },
              {
                message:
                  "No importing from parent index.ts(x?) file. A common way to make circular dependencies.",
                name: "..",
              },
            ],
            patterns: [
              {
                group: [
                  "**/extensions/renderer-api/**/*",
                  "**/extensions/main-api/**/*",
                  "**/extensions/common-api/**/*",
                ],
                message:
                  "No importing from the extension api definitions in application code",
              },
              {
                group: [
                  "**/extensions/as-legacy-globals-for-extension-api/as-legacy-global-function-for-extension-api",
                  "**/extensions/as-legacy-globals-for-extension-api/as-legacy-global-object-for-extension-api-with-modifications",
                  "**/extensions/as-legacy-globals-for-extension-api/as-legacy-global-object-for-extension-api",
                  "**/extensions/as-legacy-globals-for-extension-api/as-legacy-global-singleton-object-for-extension-api",
                ],
                message:
                  "No importing the legacy global functions in non-ExtensionApi code",
              },
            ],
          },
        ],
      },
    },
  ],
};
