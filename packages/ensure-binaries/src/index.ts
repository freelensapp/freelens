#!/usr/bin/env node

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { constants, type WriteStream } from "node:fs";
import { access, type FileHandle, mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
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
  CHECKSUM_SUFFIX,
  describeArtifact,
  normalizePlatform,
  readToolVersions,
  type SupportedArch,
  toolNames,
} from "./artifacts.js";
import { setTimeoutFor } from "./download.js";
import { assertLockMatchesVersions, readLock, resolvePinnedChecksum } from "./lock.js";

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

class BinaryDownloader {
  protected readonly bar: SingleBar;
  protected readonly target: string;
  protected readonly url: string;

  protected getTransformStreams(file: Writable): (NodeJS.ReadWriteStream | NodeJS.WritableStream)[] {
    return [file];
  }

  constructor(
    public readonly artifact: Artifact,
    protected readonly expectedChecksum: string,
    baseDir: string,
    multiBar: MultiBar,
  ) {
    this.bar = multiBar.create(1, 0, artifact);
    this.target = path.join(baseDir, artifact.platform, artifact.arch, artifact.binaryName);
    this.url = artifact.url;
  }

  private get checksumSidecar(): string {
    return `${this.target}${CHECKSUM_SUFFIX}`;
  }

  /**
   * Returns `true` when the binary is already present and matches the pinned
   * checksum, based on what the sidecar recorded during the previous successful
   * download. This avoids re-downloading unchanged binaries.
   */
  private async isUpToDate(expectedChecksum: string): Promise<boolean> {
    try {
      await access(this.target, constants.F_OK);
      const recorded = (await readFile(this.checksumSidecar, "utf-8")).trim().toLowerCase();

      return recorded === expectedChecksum;
    } catch {
      return false;
    }
  }

  async ensureBinary(): Promise<void> {
    if (process.env.LENS_SKIP_DOWNLOAD_BINARIES === "true") {
      return;
    }

    const bar = this.bar;

    // The pinned checksum covers the downloaded artifact bytes (the binary for
    // kubectl / freelens-k8s-proxy, the archive for helm). It comes from the
    // committed lock rather than from the vendor, so a build never has to trust
    // a checksum served by the same origin as the artifact it describes.
    const expectedChecksum = this.expectedChecksum;

    if (await this.isUpToDate(expectedChecksum)) {
      bar.setTotal(1);
      bar.increment(1); // already downloaded, mark as finished
      return;
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
      // Remove existing file and its stale checksum sidecar to ensure we
      // download the new version cleanly.
      for (const file of [this.target, this.checksumSidecar]) {
        try {
          await unlink(file);
        } catch (error) {
          // Ignore ENOENT errors (file doesn't exist)
          if ((error as any)?.code !== "ENOENT") {
            throw error;
          }
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

      // Record the verified checksum next to the binary so subsequent runs can
      // skip the download. Not referenced by electron-builder, so it stays out
      // of the packaged application.
      await writeFile(this.checksumSidecar, `${expectedChecksum}\n`, { mode: 0o644 });
    } catch (error) {
      await fileHandle?.close();
      // Never leave a binary behind that failed verification, was truncated, or
      // was written by a concurrent run we did not verify ourselves.
      await unlink(this.target).catch(() => {});
      throw error;
    }
  }
}

/**
 * Helm ships its binary inside a tarball, so the downloaded bytes have to be
 * gunzipped and the one entry we want picked out of the archive.
 */
class HelmDownloader extends BinaryDownloader {
  protected override getTransformStreams(file: WriteStream) {
    const extracting = extract({
      allowUnknownFormat: false,
    });

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
  expectedChecksum: string,
  baseDir: string,
  multiBar: MultiBar,
): BinaryDownloader {
  return artifact.tool === "helm"
    ? new HelmDownloader(artifact, expectedChecksum, baseDir, multiBar)
    : new BinaryDownloader(artifact, expectedChecksum, baseDir, multiBar);
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

      return createDownloader(artifact, resolvePinnedChecksum(lock, artifact), pathToBaseDir, multiBar);
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
const errorResults = settledResults.filter((res) => res.status === "rejected");

if (errorResults.length > 0) {
  for (const { reason } of errorResults) {
    console.error(String(reason));
  }

  process.exit(1);
}

process.exit(0);
