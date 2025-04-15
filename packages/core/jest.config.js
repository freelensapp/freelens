/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  collectCoverage: false,
  globalSetup: "<rootDir>/src/jest.timezone.ts",
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "\\.(svg|png|jpg|eot|woff2?|ttf)$": "<rootDir>/__mocks__/assetMock.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist", "<rootDir>/packages", "<rootDir>/static/build"],
  resolver: "<rootDir>/src/jest-28-resolver.js",
  runtime: "@side/jest-runtime",
  setupFiles: ["<rootDir>/src/jest.setup.tsx", "jest-canvas-mock"],
  setupFilesAfterEnv: ["<rootDir>/src/jest-after-env.setup.ts"],
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
  transformIgnorePatterns: ["/node_modules/(?!node-fetch)/"],
  verbose: false,
};
