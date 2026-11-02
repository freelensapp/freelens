/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Stands in for a bundled CommonJS package that `require()`s a Node builtin,
// as LangChain, the MCP SDK and `@kubernetes/client-node` do, so that the main
// bundle carries Rolldown's `__require`. `fixture-extension-main.test.ts` in
// core evaluates `dist/main.js` in plain Node, where that call throws unless
// main is built for the `node` platform (see `vite.config.mjs`).

const os = require("node:os");

exports.endOfLine = os.EOL;
