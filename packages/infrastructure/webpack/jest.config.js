const {
  configForNode: { coverageThreshold, ...config },
} = require("@freelens/jest").monorepoPackageConfig(__dirname);

module.exports = config;
