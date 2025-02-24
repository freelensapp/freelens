/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  collectCoverage: false,
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "\\.(svg|png|jpg|eot|woff2?|ttf)$": "<rootDir>/__mocks__/assetMock.ts",
    "^jsonpath-plus$": require.resolve("jsonpath-plus"),
    "^uuid$": require.resolve("uuid"),
  },
  runtime: "@side/jest-runtime",
  testEnvironment: "jsdom",
  testTimeout: 15000,
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

if (typeof window !== 'undefined') {
  window.setImmediate = window.setTimeout;
} else if (typeof global !== 'undefined') {
  global.setImmediate = global.setTimeout;
}
