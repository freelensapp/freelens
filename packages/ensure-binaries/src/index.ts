#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { constants, createReadStream, type WriteStream } from "node:fs";
import { type FileHandle, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { arch } from "node:process";
import { pipeline as _pipeline, Readable, Transform, Writable } from "node:stream";
import { promisify } from "node:util";
import arg from "arg";
import { MultiBar } from "cli-progress";
import gunzip from "gunzip-maybe";
import { extract } from "tar-stream";
import { fetch } from "undici";
import {
  type Artifact,
  describeArtifact,
  isArchived,
  normalizePlatform,
  readToolVersions,
  type SupportedArch,
  toolNames,
} from "./artifacts.js";
import { setTimeoutFor } from "./download.js";
import { assertLockMatchesVersions, type PinnedDigests, readLock, resolvePinnedDigests } from "./lock.js";

import type { SingleBar } from "cli-progress";

const options = arg({
  "--package": String,
  "--base-dir": String,
  "--lock": String,
});

type Options = typeof options;

function assertOption<Key extends keyof Options>(key: Key): NonNullable<Options[Key]> {
  const raw = options[key];

  if (raw === undefined) {
    console.error(`missing ${key} option`);
    process.exit(1);
  }

  return raw;
}

function joinWithInitCwd(relativePath: string): string {
  const { INIT_CWD } = process.env;

  if (!INIT_CWD) {
    return relativePath;
  }

  return path.join(INIT_CWD, relativePath);
}

const pathToPackage = joinWithInitCwd(assertOption("--package"));
const pathToBaseDir = joinWithInitCwd(assertOption("--base-dir"));
const pathToLock = joinWithInitCwd(
  options["--lock"] ?? path.join(path.dirname(assertOption("--package")), "binaries.lock.json"),
);

const pipeline = promisify(_pipeline);

async function digestOfFile(file: string): Promise<string> {
  const hash = createHash("sha256");

  await pipeline(createReadStream(file), hash);

  return hash.digest("hex");
}

/** What {@link BinaryDownloader.ensureBinary} did, reported once the bars are gone. */
type Outcome = "skipped" | "up to date" | "downloaded";

class BinaryDownloader {
  protected readonly bar: SingleBar;
  protected readonly target: string;
  protected readonly url: string;

  protected getTransformStreams(file: Writable): (NodeJS.ReadWriteStream | NodeJS.WritableStream)[] {
    return [file];
  }

  constructor(
    public readonly artifact: Artifact,
    protected readonly digests: PinnedDigests,
    baseDir: string,
    multiBar: MultiBar,
  ) {
    this.bar = multiBar.create(1, 0, artifact);
    this.target = path.join(baseDir, artifact.platform, artifact.arch, artifact.binaryName);
    this.url = artifact.url;
  }

  /**
   * Returns `true` when the binary is already in place with the pinned digest.
   * The file is hashed on every run rather than trusting a record left next to
   * it: the directory may come from a CI cache, and whoever could write the
   * binary there could write such a record too.
   */
  private async isUpToDate(): Promise<boolean> {
    try {
      return (await digestOfFile(this.target)) === this.digests.binary;
    } catch {
      return false;
    }
  }

  async ensureBinary(): Promise<Outcome> {
    if (process.env.FREELENS_SKIP_DOWNLOAD_BINARIES === "true") {
      return "skipped";
    }

    const bar = this.bar;

    // The pinned digests come from the committed lock rather than from the
    // vendor, so a build never has to trust a checksum served by the same origin
    // as the artifact it describes. One covers the downloaded bytes (the binary
    // for kubectl / freelens-k8s-proxy, the archive for helm), the other the
    // binary as it is stored.
    const { artifact: expectedChecksum, binary: expectedBinaryChecksum } = this.digests;

    if (await this.isUpToDate()) {
      bar.setTotal(1);
      bar.increment(1); // already downloaded, mark as finished
      return "up to date";
    }

    const controller = new AbortController();

    setTimeoutFor(controller, 15 * 60 * 1000);

    const stream = await fetch(this.url, {
      signal: controller.signal,
    });

    if (!stream.ok) {
      throw new Error(`${this.url}: ${stream.status} ${stream.statusText}`);
    }

    const total = Number(stream.headers.get("content-length"));
    let fileHandle: FileHandle | undefined = undefined;

    if (isNaN(total)) {
      throw new Error("no content-length header was present");
    }

    bar.setTotal(total);

    await mkdir(path.dirname(this.target), {
      mode: 0o755,
      recursive: true,
    });

    // Hash the raw downloaded bytes so the digest matches the semantics of the
    // remote `.sha256` for every binary type.
    const hash = createHash("sha256");

    try {
      // Remove the existing file to ensure we download the new version cleanly.
      try {
        await unlink(this.target);
      } catch (error) {
        // Ignore ENOENT errors (file doesn't exist)
        if ((error as any)?.code !== "ENOENT") {
          throw error;
        }
      }

      /**
       * This is necessary because for some reason `createWriteStream({ flags: "wx" })`
       * was throwing someplace else and not here
       */
      const handle = (fileHandle = await open(this.target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL));

      if (!stream.body) {
        throw new Error("no body on stream");
      }

      await pipeline(
        Readable.fromWeb(stream.body),
        new Transform({
          transform(chunk, encoding, callback) {
            bar.increment(chunk.length);
            hash.update(chunk);
            this.push(chunk);
            callback();
          },
        }),
        ...this.getTransformStreams(
          new Writable({
            write(chunk, encoding, cb) {
              handle
                .write(chunk)
                .then(() => cb())
                .catch(cb);
            },
          }),
        ),
      );

      const actualChecksum = hash.digest("hex");

      if (actualChecksum !== expectedChecksum) {
        throw new Error(`checksum mismatch for ${this.url}: expected ${expectedChecksum}, got ${actualChecksum}`);
      }

      await fileHandle.chmod(0o755);
      await fileHandle.close();
      fileHandle = undefined;

      // The archive matched its pin, so this checks the extraction; for a binary
      // downloaded as is, it only rereads what was just written.
      const actualBinaryChecksum = await digestOfFile(this.target);

      if (actualBinaryChecksum !== expectedBinaryChecksum) {
        throw new Error(
          `checksum mismatch for ${this.artifact.binaryName} from ${this.url}: expected ${expectedBinaryChecksum}, got ${actualBinaryChecksum}`,
        );
      }
    } catch (error) {
      await fileHandle?.close();
      // Never leave a binary behind that failed verification, was truncated, or
      // was written by a concurrent run we did not verify ourselves.
      await unlink(this.target).catch(() => {});
      throw error;
    }

    return "downloaded";
  }
}

/**
 * Helm ships its binary inside a tarball, so the downloaded bytes have to be
 * gunzipped and the one entry we want picked out of the archive.
 */
class HelmDownloader extends BinaryDownloader {
  protected override getTransformStreams(file: WriteStream) {
    const extracting = extract();

    extracting.on("entry", (headers, stream, next) => {
      if (headers.name.endsWith(this.artifact.binaryName)) {
        stream
          .pipe(file)
          .once("finish", () => next())
          .once("error", next);
      } else {
        stream.resume();
        next();
      }
    });

    return [gunzip(3), extracting];
  }
}

function createDownloader(
  artifact: Artifact,
  digests: PinnedDigests,
  baseDir: string,
  multiBar: MultiBar,
): BinaryDownloader {
  return isArchived(artifact)
    ? new HelmDownloader(artifact, digests, baseDir, multiBar)
    : new BinaryDownloader(artifact, digests, baseDir, multiBar);
}

const versions = await readToolVersions(pathToPackage);
const platform = normalizePlatform(process.platform);

const multiBar = new MultiBar({
  align: "left",
  clearOnComplete: false,
  hideCursor: true,
  autopadding: true,
  noTTYOutput: true,
  format: "[{bar}] {percentage}% | {url}",
});

/**
 * Resolves every download up front, before any network access, so that a stale
 * lock fails immediately with an actionable message rather than part-way
 * through a set of downloads.
 */
async function prepareDownloaders(): Promise<BinaryDownloader[]> {
  const lock = await readLock(pathToLock);

  assertLockMatchesVersions(lock, versions, pathToLock);

  const downloadersFor = (targetArch: SupportedArch) =>
    toolNames.map((tool) => {
      const artifact = describeArtifact({ tool, version: versions[tool], platform, arch: targetArch });

      return createDownloader(artifact, resolvePinnedDigests(lock, artifact), pathToBaseDir, multiBar);
    });

  if (process.env.DOWNLOAD_ALL_ARCHITECTURES === "true") {
    return [...downloadersFor("x64"), ...downloadersFor("arm64")];
  }

  return arch === "x64" || arch === "arm64" ? downloadersFor(arch) : [];
}

const downloaders = await prepareDownloaders().catch((error: unknown) => {
  multiBar.stop();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

const settledResults = await Promise.allSettled(
  downloaders.map((downloader) =>
    downloader.ensureBinary().catch((error) => {
      const { binaryName, platform, arch } = downloader.artifact;

      throw new Error(`Failed to download ${binaryName} for ${platform}/${arch}: ${error}`);
    }),
  ),
);

multiBar.stop();

// The bars end at 100% either way, so say which binaries were fetched.
downloaders.forEach((downloader, index) => {
  const result = settledResults[index];
  const { binaryName, platform, arch } = downloader.artifact;

  if (result?.status === "fulfilled") {
    console.log(`${binaryName} for ${platform}/${arch}: ${result.value}`);
  }
});

const errorResults = settledResults.filter((res) => res.status === "rejected");

if (errorResults.length > 0) {
  for (const { reason } of errorResults) {
    console.error(String(reason));
  }

  process.exit(1);
}

process.exit(0);
