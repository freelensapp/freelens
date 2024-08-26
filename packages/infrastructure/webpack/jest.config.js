const {
  configForNode: { coverageThreshold, ...config },
} = require("@freelensapp/jest").monorepoPackageConfig(__dirname);

module.exports = config;
