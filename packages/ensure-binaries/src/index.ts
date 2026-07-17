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
import { pipeline as _pipeline, Transform, Writable } from "node:stream";
import { promisify } from "node:util";
import arg from "arg";
import { MultiBar } from "cli-progress";
import gunzip from "gunzip-maybe";
import fetch from "node-fetch";
import { extract } from "tar-stream";
import z from "zod";

import type { SingleBar } from "cli-progress";

const options = arg({
  "--package": String,
  "--base-dir": String,
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

function setTimeoutFor(controller: AbortController, timeout: number): void {
  const handle = setTimeout(() => controller.abort(), timeout);

  controller.signal.addEventListener("abort", () => clearTimeout(handle));
}

const pipeline = promisify(_pipeline);

/**
 * Suffix for the sidecar file that records the verified checksum of a downloaded
 * binary. It lives next to the binary but is never referenced by
 * electron-builder (which lists each packaged binary explicitly), so it does not
 * end up in the resulting application package.
 */
const CHECKSUM_SUFFIX = ".sha256";

/**
 * Fetches and parses a remote `.sha256` checksum for the given download URL.
 *
 * The checksum file is expected to contain a hex-encoded SHA-256 digest,
 * optionally followed by the file name (the common `sha256sum` output format).
 * Only the first whitespace-delimited token is used.
 *
 * Returns `undefined` when the checksum is not available (e.g. HTTP 404), in
 * which case the caller downloads the binary without verification.
 */
async function fetchChecksum(url: string): Promise<string | undefined> {
  const controller = new AbortController();

  setTimeoutFor(controller, 60 * 1000);

  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(`${url}${CHECKSUM_SUFFIX}`, { signal: controller.signal });
  } catch {
    return undefined;
  }

  if (!response.ok) {
    return undefined;
  }

  const body = await response.text();
  const checksum = body.trim().split(/\s+/)[0]?.toLowerCase();

  if (!checksum || !/^[0-9a-f]{64}$/.test(checksum)) {
    return undefined;
  }

  return checksum;
}

function getBinaryExtension({ forPlatform }: { forPlatform: string }): string {
  if (forPlatform === "windows") {
    return ".exe";
  }

  return "";
}

interface BinaryDownloaderArgs {
  readonly version: string;
  readonly platform: SupportedPlatform;
  readonly downloadArch: string;
  readonly fileArch: string;
  readonly binaryName: string;
  readonly baseDir: string;
  readonly url: string;
}

abstract class BinaryDownloader {
  protected abstract readonly url: string;
  protected readonly bar: SingleBar;
  protected readonly target: string;

  protected getTransformStreams(file: Writable): (NodeJS.ReadWriteStream | NodeJS.WritableStream)[] {
    return [file];
  }

  constructor(
    public readonly args: BinaryDownloaderArgs,
    multiBar: MultiBar,
  ) {
    this.bar = multiBar.create(1, 0, args);
    this.target = path.join(args.baseDir, args.platform, args.fileArch, args.binaryName);
  }

  private get checksumSidecar(): string {
    return `${this.target}${CHECKSUM_SUFFIX}`;
  }

  /**
   * Returns `true` when the binary is already present and matches the given
   * remote checksum, based on the checksum recorded in the sidecar file during
   * the previous successful download. This avoids re-downloading unchanged
   * binaries.
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

    // The remote `.sha256` covers the downloaded artifact bytes (the binary for
    // kubectl / freelens-k8s-proxy, the archive for helm). When it is available
    // we can both skip unchanged binaries and verify freshly downloaded ones.
    const expectedChecksum = await fetchChecksum(this.url);

    if (expectedChecksum && (await this.isUpToDate(expectedChecksum))) {
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
        stream.body,
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

      if (expectedChecksum) {
        const actualChecksum = hash.digest("hex");

        if (actualChecksum !== expectedChecksum) {
          throw new Error(`checksum mismatch for ${this.url}: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
      }

      await fileHandle.chmod(0o755);
      await fileHandle.close();
      fileHandle = undefined;

      // Record the verified checksum next to the binary so subsequent runs can
      // skip the download. Not referenced by electron-builder, so it stays out
      // of the packaged application.
      if (expectedChecksum) {
        await writeFile(this.checksumSidecar, `${expectedChecksum}\n`, { mode: 0o644 });
      }
    } catch (error) {
      await fileHandle?.close();

      if ((error as any)?.code === "EEXIST") {
        bar.increment(total); // mark as finished
        controller.abort(); // stop trying to download
      } else {
        await unlink(this.target).catch(() => {});
        throw error;
      }
    }
  }
}

class FreeLensK8sProxyDownloader extends BinaryDownloader {
  protected readonly url: string;

  constructor(args: Omit<BinaryDownloaderArgs, "binaryName" | "url">, bar: MultiBar) {
    const binaryExtension = getBinaryExtension({ forPlatform: args.platform });
    const binaryName = "freelens-k8s-proxy" + binaryExtension;
    const url = `https://github.com/freelensapp/freelens-k8s-proxy/releases/download/v${args.version}/freelens-k8s-proxy-${args.platform}-${args.downloadArch}${binaryExtension}`;

    super({ ...args, binaryName, url }, bar);
    this.url = url;
  }
}

class KubectlDownloader extends BinaryDownloader {
  protected readonly url: string;

  constructor(args: Omit<BinaryDownloaderArgs, "binaryName" | "url">, bar: MultiBar) {
    const binaryName = "kubectl" + getBinaryExtension({ forPlatform: args.platform });
    const url = `https://dl.k8s.io/release/v${args.version}/bin/${args.platform}/${args.downloadArch}/${binaryName}`;

    super({ ...args, binaryName, url }, bar);
    this.url = url;
  }
}

class HelmDownloader extends BinaryDownloader {
  protected readonly url: string;

  constructor(args: Omit<BinaryDownloaderArgs, "binaryName" | "url">, bar: MultiBar) {
    const binaryName = "helm" + getBinaryExtension({ forPlatform: args.platform });
    const url = `https://get.helm.sh/helm-v${args.version}-${args.platform}-${args.downloadArch}.tar.gz`;

    super({ ...args, binaryName, url }, bar);
    this.url = url;
  }

  protected getTransformStreams(file: WriteStream) {
    const extracting = extract({
      allowUnknownFormat: false,
    });

    extracting.on("entry", (headers, stream, next) => {
      if (headers.name.endsWith(this.args.binaryName)) {
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

type SupportedPlatform = "darwin" | "linux" | "windows";

const PackageInfo = z.object({
  config: z.object({
    k8sProxyVersion: z.string().min(1),
    bundledKubectlVersion: z.string().min(1),
    bundledHelmVersion: z.string().min(1),
  }),
});

const packageInfoRaw = await readFile(pathToPackage, "utf-8");
const packageInfo = PackageInfo.parse(JSON.parse(packageInfoRaw));

const normalizedPlatform = (() => {
  switch (process.platform) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`platform=${process.platform} is unsupported`);
  }
})();
const multiBar = new MultiBar({
  align: "left",
  clearOnComplete: false,
  hideCursor: true,
  autopadding: true,
  noTTYOutput: true,
  format: "[{bar}] {percentage}% | {url}",
});

const downloaders: BinaryDownloader[] = [];

const downloadX64Binaries = () => {
  downloaders.push(
    new FreeLensK8sProxyDownloader(
      {
        version: packageInfo.config.k8sProxyVersion,
        platform: normalizedPlatform,
        downloadArch: "amd64",
        fileArch: "x64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
    new KubectlDownloader(
      {
        version: packageInfo.config.bundledKubectlVersion,
        platform: normalizedPlatform,
        downloadArch: "amd64",
        fileArch: "x64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
    new HelmDownloader(
      {
        version: packageInfo.config.bundledHelmVersion,
        platform: normalizedPlatform,
        downloadArch: "amd64",
        fileArch: "x64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
  );
};

function downloadArm64Binaries() {
  downloaders.push(
    new FreeLensK8sProxyDownloader(
      {
        version: packageInfo.config.k8sProxyVersion,
        platform: normalizedPlatform,
        downloadArch: "arm64",
        fileArch: "arm64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
    new KubectlDownloader(
      {
        version: packageInfo.config.bundledKubectlVersion,
        platform: normalizedPlatform,
        downloadArch: "arm64",
        fileArch: "arm64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
    new HelmDownloader(
      {
        version: packageInfo.config.bundledHelmVersion,
        platform: normalizedPlatform,
        downloadArch: "arm64",
        fileArch: "arm64",
        baseDir: pathToBaseDir,
      },
      multiBar,
    ),
  );
}

if (process.env.DOWNLOAD_ALL_ARCHITECTURES === "true") {
  downloadX64Binaries();
  downloadArm64Binaries();
} else if (arch === "x64") {
  downloadX64Binaries();
} else if (arch === "arm64") {
  downloadArm64Binaries();
}

const settledResults = await Promise.allSettled(
  downloaders.map((downloader) =>
    downloader.ensureBinary().catch((error) => {
      throw new Error(
        `Failed to download ${downloader.args.binaryName} for ${downloader.args.platform}/${downloader.args.downloadArch}: ${error}`,
      );
    }),
  ),
);

multiBar.stop();
const errorResult = settledResults.find((res) => res.status === "rejected") as PromiseRejectedResult | undefined;

if (errorResult) {
  console.error("234", String(errorResult.reason));
  process.exit(1);
}

process.exit(0);
