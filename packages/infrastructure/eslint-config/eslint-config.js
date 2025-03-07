module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:xss/recommended",
    "plugin:no-unsanitized/DOM",
  ],
  plugins: ["unused-imports", "prettier", "xss", "no-unsanitized"],
  ignorePatterns: ["dist/*"],
  rules: {
    "react/react-in-jsx-scope": 0,
    "security/detect-object-injection": "off",
    "security/detect-non-literal-fs-filename": "off",
  },
  overrides: [
    {
      files: ["**/*.ts?(x)", "**/*.js?(x)", "**/*.@(m|c)js"],
      rules: {
        // Typescript specific rules
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/naming-convention": "off",
        "@typescript-eslint/no-duplicate-enum-values": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/no-unsafe-declaration-merging": "off",
        "@typescript-eslint/no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
          },
        ],
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-use-before-define": [
          "error",
          {
            classes: false,
            functions: false,
          },
        ],
        "@typescript-eslint/no-useless-constructor": "off",

        "class-methods-use-this": "off",
        "comma-dangle": "off",
        curly: "error",
        "eol-last": ["error", "always"],
        "import/extensions": "off",
        "import/no-extraneous-dependencies": "off",
        "import/no-named-as-default": 0,
        "import/no-named-as-default-member": "off",
        "import/prefer-default-export": "off",
        indent: "off",
        "jsx-a11y/no-redundant-roles": ["off"],
        "keyword-spacing": "off",
        "linebreak-style": ["error", "unix"],
        "max-classes-per-file": "off",
        "max-len": [
          "error",
          120,
          2,
          {
            ignoreComments: false,
            ignoreRegExpLiterals: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreUrls: true,
          },
        ],
        "no-param-reassign": [
          "error",
          {
            props: false,
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            message:
              "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
            selector: "ForInStatement",
          },
          {
            message:
              "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
            selector: "WithStatement",
          },
        ],
        "no-shadow": "off",
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
        "prettier/prettier": 2,
        quotes: [
          "error",
          "double",
          {
            allowTemplateLiterals: true,
            avoidEscape: true,
          },
        ],

        // React specific rules
        "react-hooks/exhaustive-deps": "off",
        "react/function-component-definition": "off",
        "react/prop-types": "off",
        "react/require-default-props": "off",

        "template-curly-spacing": "error",

        // testing-library
        "testing-library/no-container": "off",
        "testing-library/no-node-access": "off",
        "testing-library/no-render-in-setup": "off",
        "testing-library/prefer-screen-queries": "off",
        "testing-library/render-result-naming-convention": "off",
      },
    },
  ],
};
