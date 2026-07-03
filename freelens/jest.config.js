/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  collectCoverage: false,
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "\\.(svg|png|jpg|eot|woff2?|ttf)$": "<rootDir>/__mocks__/assetMock.ts",
    "^uuid$": require.resolve("uuid"),
  },
  runtime: "@side/jest-runtime",
  // The integration tests drive a real Electron app through Playwright and do
  // not use the DOM. Playwright >= 1.61 bundles undici, which references
  // `global.Request` at import time; that global is undefined under jsdom, so
  // the "node" environment is required for the Playwright import to succeed.
  testEnvironment: "node",
  testTimeout: 120000,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/"],
  verbose: false,
};
