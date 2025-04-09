# Lens Code Style

**Note:** This package contains Eslint and Prettier configurations, name of package is `@freelensapp/eslint-config` just because Eslint has arbitrary requirement (<https://eslint.org/docs/latest/extend/shareable-configs>).

## Usage

1. Install `@freelensapp/eslint-config`
2. Create `.prettierrc` that contains `"@freelensapp/eslint-config/prettier"`
3. Add a `.eslintrc.js` that extends `@freelensapp/eslint-config/eslint`, for example:

```js
module.exports = {
  extends: "@freelensapp/eslint-config/eslint",
  parserOptions: {
    project: "./tsconfig.json"
  }
};
```

4. Add linting and formatting scripts to `package.json`

```json
{
  "scripts": {
    "lint": "lens-lint",
    "lint:fix": "lens-lint --fix"
  }
}
```

6. Run `pnpm lint` to lint
7. Run `pnpm format` to fix all formatting
