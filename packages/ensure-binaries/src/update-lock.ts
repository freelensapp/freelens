#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import arg from "arg";
import { artifactKey, describeAllArtifacts, readToolVersions, type ToolName, toolNames } from "./artifacts.js";
import { type BinariesLock, readLock, writeLock } from "./lock.js";
import { mapWithConcurrency, pinArtifact } from "./pin.js";

/**
 * Regenerates the committed lock file pinning every bundled binary.
 *
 * Each of the eighteen artifacts goes through the shared pinning flow in
 * `pin.ts` - vendor checksum, download, hash, publisher signature - and the
 * lock is only written when every one of them matched.
 */

const options = arg({
  "--package": String,
  "--lock": String,
  "--only": [String],
});

// Relative paths resolve against the working directory, which pnpm sets to the
// package running the script. INIT_CWD would not do: it holds the directory
// pnpm was invoked from, so `pnpm -r update-binaries-lock` at the repository
// root would look for the root package.json instead of freelens/package.json.
const pathToPackage = path.resolve(options["--package"] ?? "package.json");
const pathToLock = path.resolve(
  options["--lock"] ?? path.join(path.dirname(options["--package"] ?? "."), "binaries.lock.json"),
);

const only = options["--only"];

if (only) {
  const unknown = only.filter((tool) => !toolNames.includes(tool as ToolName));

  if (unknown.length > 0) {
    console.error(`unknown tool(s) for --only: ${unknown.join(", ")}. Known: ${toolNames.join(", ")}`);
    process.exit(1);
  }
}

const versions = await readToolVersions(pathToPackage);
const wanted = describeAllArtifacts(versions).filter((artifact) => !only || only.includes(artifact.tool));

console.log(`Pinning ${wanted.length} artifact(s) from ${pathToPackage}:`);
for (const tool of toolNames) {
  if (!only || only.includes(tool)) {
    console.log(`  ${tool} ${versions[tool]}`);
  }
}

const settled = await Promise.allSettled([
  mapWithConcurrency(wanted, 4, async (artifact) => ({
    artifact,
    sha256: await pinArtifact(artifact).catch((error) => {
      throw new Error(`Failed to pin ${artifact.tool} for ${artifactKey(artifact)}: ${error}`);
    }),
  })),
]);

const [result] = settled;

if (!result || result.status === "rejected") {
  console.error(String(result?.reason ?? "nothing to pin"));
  process.exit(1);
}

// Start from the previous lock so that a --only run keeps the other tools.
const previous: BinariesLock = only
  ? await readLock(pathToLock).catch(() => ({}) as BinariesLock)
  : ({} as BinariesLock);
const lock: BinariesLock = { ...previous };

for (const tool of toolNames) {
  const pinned = result.value.filter((entry) => entry.artifact.tool === tool);

  if (pinned.length === 0) {
    continue;
  }

  lock[tool] = {
    version: versions[tool],
    artifacts: Object.fromEntries(
      pinned.map(({ artifact, sha256 }) => [artifactKey(artifact), { url: artifact.url, sha256 }]),
    ),
  };
}

await writeLock(pathToLock, lock);

console.log(`Wrote ${pathToLock}`);

process.exit(0);
