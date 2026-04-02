#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { rebuild } = require("@electron/rebuild");

// electron-builder requires a pnpm-lock.yaml file to detect the project as a pnpm workspace.
// The real lockfile lives in the monorepo root, so we generate a dummy one here before building.
fs.writeFileSync("pnpm-lock.yaml", "# This file is detected by electron-builder\n");

// Read exact electron version from electron-builder.yml
const yaml = fs.readFileSync(path.join(__dirname, "../electron-builder.yml"), "utf-8");
const electronVersion = yaml.match(/^electronVersion:\s*(\S+)/m)[1];

rebuild({
  buildPath: path.join(__dirname, ".."),
  electronVersion,
  force: true,
})
  .then(() => console.info("Rebuild successful"))
  .catch((err) => {
    console.error("Rebuild failed:", err);
    process.exit(1);
  });
