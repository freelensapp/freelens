#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import arg from "arg";
import {
  type Artifact,
  artifactKey,
  describeAllArtifacts,
  readToolVersions,
  type ToolName,
  toolNames,
} from "./artifacts.js";
import { digestRemote, fetchChecksum } from "./download.js";
import { type BinariesLock, readLock, writeLock } from "./lock.js";

/**
 * Regenerates the committed lock file pinning every bundled binary.
 *
 * For each of the eighteen artifacts it fetches the vendor checksum, downloads
 * the artifact and hashes it, and only writes the lock when everything matched.
 * Downloading rather than trusting the published checksum is the point: it
 * proves the digest we pin describes bytes that were actually served.
 */

const options = arg({
  "--package": String,
  "--lock": String,
  "--only": [String],
});

function joinWithInitCwd(relativePath: string): string {
  const { INIT_CWD } = process.env;

  return INIT_CWD ? path.join(INIT_CWD, relativePath) : relativePath;
}

const pathToPackage = joinWithInitCwd(options["--package"] ?? "package.json");
const pathToLock = joinWithInitCwd(
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

/** Runs tasks with a bounded number in flight, preserving input order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;

      results[index] = await task(items[index] as T);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));

  return results;
}

async function pinArtifact(artifact: Artifact): Promise<{ artifact: Artifact; sha256: string }> {
  const published = await fetchChecksum(artifact.checksumUrl);
  const actual = await digestRemote(artifact.url);

  if (actual !== published) {
    throw new Error(
      `${artifact.url} does not match its published checksum: ${artifact.checksumUrl} says ${published}, the download hashes to ${actual}`,
    );
  }

  console.log(`  ${artifact.tool} ${artifactKey(artifact)} ${actual}`);

  return { artifact, sha256: actual };
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
  mapWithConcurrency(wanted, 4, (artifact) =>
    pinArtifact(artifact).catch((error) => {
      throw new Error(`Failed to pin ${artifact.tool} for ${artifactKey(artifact)}: ${error}`);
    }),
  ),
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
