module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:xss/recommended",
    "plugin:no-unsanitized/DOM"
  ],
  plugins: [
    "unused-imports",
    "prettier",
    "xss",
    "no-unsanitized"
  ],
  ignorePatterns: [
    "dist/*"
  ],
  rules: {
    "react/react-in-jsx-scope": 0,
    "security/detect-object-injection": "off",
    "security/detect-non-literal-fs-filename": "off"
  },
  overrides: [
    {
      files: [
        "**/*.ts?(x)",
        "**/*.js?(x)",
        "**/*.@(m|c)js"
      ],
      rules: {
        "prettier/prettier": 2,
        indent: "off", // Let prettier do it
        curly: "error",
        "import/prefer-default-export": "off",
        "import/no-named-as-default-member": "off",
        "import/no-named-as-default": 0,
        "class-methods-use-this": "off",
        "comma-dangle": "off",
        "max-classes-per-file": "off",
        "no-shadow": "off",
        "no-param-reassign": ["error", { props: false }],
        quotes: [
          "error",
          "double",
          {
            "avoidEscape": true,
            "allowTemplateLiterals": true
          }
        ],
        "@typescript-eslint/no-use-before-define": ["error", {
          "functions": false,
          "classes": false,
        }],
        "padding-line-between-statements": [
          "error",
          {
            blankLine: "always",
            prev: "*",
            next: "return",
          },
          {
            blankLine: "always",
            prev: "*",
            next: "block-like",
          },
          {
            blankLine: "always",
            prev: "*",
            next: "function",
          },
          {
            blankLine: "always",
            prev: "*",
            next: "class",
          },
          {
            blankLine: "always",
            prev: ["const", "let", "var"],
            next: "*",
          },
          {
            blankLine: "any",
            prev: ["const", "let", "var"],
            next: ["const", "let", "var"],
          },
        ],
        "import/no-extraneous-dependencies": "off",
        "jsx-a11y/no-redundant-roles": ["off"],
        "no-restricted-syntax": [
          "error",
          {
            selector: "ForInStatement",
            message:
              "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
          },
          {
            selector: "WithStatement",
            message:
              "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
          },
        ],
        "max-len": [
          "error",
          120,
          2,
          {
            ignoreUrls: true,
            ignoreComments: false,
            ignoreRegExpLiterals: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
          },
        ],
        "import/extensions": "off",
        "linebreak-style": ["error", "unix"],
        "eol-last": ["error", "always"],
        "object-shorthand": "error",
        "prefer-template": "error",
        "template-curly-spacing": "error",
        "keyword-spacing": "off",

        // testing-library
        "testing-library/no-node-access": "off",
        "testing-library/no-container": "off",
        "testing-library/prefer-screen-queries": "off",
        "testing-library/no-render-in-setup": "off",
        "testing-library/render-result-naming-convention": "off",

        // Typescript specific rules
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-useless-constructor": "off",
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
          },
        ],
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/naming-convention": "off",
        "@typescript-eslint/no-unsafe-declaration-merging": "off",
        "@typescript-eslint/no-duplicate-enum-values": "off",

        // React specific rules
        "react-hooks/exhaustive-deps": "off",
        "react/require-default-props": "off",
        "react/function-component-definition": "off",
        "react/prop-types": "off",
      },
    },
  ],
};
