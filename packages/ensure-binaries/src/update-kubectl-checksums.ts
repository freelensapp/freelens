#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import arg from "arg";
import z from "zod";
import { artifactKey, describeArtifact, supportedArches, supportedPlatforms } from "./artifacts.js";
import { resourceExists } from "./download.js";
import { type KubectlChecksums, readKubectlChecksums, writeKubectlChecksums } from "./kubectl-checksums.js";
import { mapWithConcurrency, pinArtifact } from "./pin.js";

import type { SupportedArch, SupportedPlatform } from "./artifacts.js";

/**
 * Adds a verified digest for every kubectl the application may download.
 *
 * Two rules shape everything below.
 *
 * Read from dl.k8s.io only. The mirror preference decides where a user's
 * download comes from, but pinning bytes fetched from a mirror would let a
 * compromised mirror bless its own digest. Pinning from the canonical source is
 * what holds every mirror to what upstream actually published, so the URLs come
 * from `describeArtifact`, which hardcodes it, and the mirror never enters here.
 *
 * Never rewrite an existing entry. Skipping what is already pinned makes the
 * run incremental - a patch release day costs six downloads per moved minor
 * rather than the whole table - and makes a pin immutable by construction, so a
 * digest cannot quietly change underneath a version that stood still.
 */

const options = arg({
  "--versions": String,
  "--checksums": String,
  "--concurrency": Number,
});

// Relative paths resolve against the working directory, which pnpm sets to the
// package running the script.
const pathToVersions = path.resolve(options["--versions"] ?? path.join("build", "versions.json"));
const pathToChecksums = path.resolve(options["--checksums"] ?? path.join("build", "checksums.json"));

// Four at a time keeps peak disk at roughly four artifacts, about 240 MB.
const concurrency = options["--concurrency"] ?? 4;

/** The `[majorMinor, patch][]` map that `compute-versions` writes. */
const KubectlVersions = z.array(z.tuple([z.string(), z.string()]));

interface Variant {
  readonly version: string;
  readonly platform: SupportedPlatform;
  readonly arch: SupportedArch;
}

type Outcome =
  | { kind: "pinned"; variant: Variant; url: string; sha256: string }
  | { kind: "unpublished"; variant: Variant }
  | { kind: "failed"; variant: Variant; error: unknown };

function describe({ version, platform, arch }: Variant): string {
  return `kubectl v${version} ${artifactKey({ platform, arch })}`;
}

const versions = KubectlVersions.parse(JSON.parse(await readFile(pathToVersions, "utf-8"))).map(([, patch]) => patch);
const checksums: KubectlChecksums = await readKubectlChecksums(pathToChecksums);

const wanted = versions.flatMap((version) =>
  supportedPlatforms.flatMap((platform) =>
    supportedArches
      .map((arch) => ({ version, platform, arch }))
      .filter((variant) => !checksums[variant.version]?.[artifactKey(variant)]),
  ),
);

console.log(
  `${versions.length} kubectl version(s) in ${pathToVersions}, ${wanted.length} variant(s) not yet pinned in ${pathToChecksums}.`,
);

const outcomes = await mapWithConcurrency<Variant, Outcome>(wanted, concurrency, async (variant) => {
  const artifact = describeArtifact({ tool: "kubectl", ...variant });

  try {
    // A variant upstream never built has no checksum and no signature either,
    // so the absence has to be established before anything else is asked for.
    // Only then is a 404 on the sidecar files a genuine failure.
    if (!(await resourceExists(artifact.url))) {
      return { kind: "unpublished", variant };
    }

    return {
      kind: "pinned",
      variant,
      url: artifact.url,
      sha256: await pinArtifact(artifact, describe(variant)),
    };
  } catch (error) {
    return { kind: "failed", variant, error };
  }
});

for (const outcome of outcomes) {
  if (outcome.kind === "pinned") {
    checksums[outcome.variant.version] = {
      ...checksums[outcome.variant.version],
      [artifactKey(outcome.variant)]: { url: outcome.url, sha256: outcome.sha256 },
    };
  }
}

// Written before reporting failures, and before exiting on them. Every pin in
// here was verified, so keeping the ones that succeeded turns a network blip
// into a shorter rerun rather than a repeat of the whole table.
await writeKubectlChecksums(pathToChecksums, checksums);

// An unpublished variant is a legitimate gap - v1.22.17 has no windows/arm64 -
// but it is also indistinguishable from full coverage once the file is written,
// so say so out loud rather than letting the table imply six of everything.
const unpublished = outcomes.filter((outcome) => outcome.kind === "unpublished");

if (unpublished.length > 0) {
  console.log(`Not published upstream, nothing pinned for ${unpublished.length} variant(s):`);
  for (const { variant } of unpublished) {
    console.log(`  ${describe(variant)}`);
  }
}

const pinned = outcomes.filter((outcome) => outcome.kind === "pinned").length;
const total = Object.values(checksums).reduce((count, variants) => count + Object.keys(variants).length, 0);

console.log(`Wrote ${pathToChecksums}: ${pinned} new pin(s), ${total} in total.`);

const failed = outcomes.filter((outcome) => outcome.kind === "failed");

if (failed.length > 0) {
  console.error(`Failed to pin ${failed.length} variant(s):`);
  for (const { variant, error } of failed) {
    console.error(`  ${describe(variant)}: ${error}`);
  }

  process.exit(1);
}

process.exit(0);
