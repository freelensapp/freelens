const config = require("@freelensapp/jest").monorepoPackageConfig(__dirname).configForReact;

module.exports = { ...config, coverageThreshold: undefined };
