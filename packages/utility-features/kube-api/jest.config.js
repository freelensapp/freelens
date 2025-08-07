const { configForNode } = require("@freelensapp/jest").monorepoPackageConfig(__dirname);

module.exports = {
  ...configForNode,
  moduleNameMapper: {
    ...configForNode.moduleNameMapper,
    "node-fetch": "identity-obj-proxy",
  },
};
