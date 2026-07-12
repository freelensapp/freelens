#!/usr/bin/env node
"use strict";

const fs = require("fs");

// electron-builder requires a pnpm-lock.yaml file to detect the project as a pnpm workspace.
// The real lockfile lives in the monorepo root, so we generate a dummy one here before building.
fs.writeFileSync("pnpm-lock.yaml", "# This file is detected by electron-builder\n");
