/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline as _pipeline, Transform } from "node:stream";
import { promisify } from "node:util";
import fetch from "node-fetch";

const pipeline = promisify(_pipeline);

/**
 * How many times to ask for a remote checksum before giving up. Verification is
 * mandatory, so a transient network error must not be able to fail the whole
 * build on the first try.
 */
const CHECKSUM_FETCH_ATTEMPTS = 3;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function setTimeoutFor(controller: AbortController, timeout: number): void {
  const handle = setTimeout(() => controller.abort(), timeout);

  controller.signal.addEventListener("abort", () => clearTimeout(handle));
}

/**
 * Fetches and parses the SHA-256 checksum a vendor publishes for a download.
 *
 * The checksum file is expected to contain a hex-encoded SHA-256 digest,
 * optionally followed by the file name (the common `sha256sum` output format).
 * Only the first whitespace-delimited token is used.
 *
 * Throws rather than returning nothing, so a caller can never silently proceed
 * without a checksum to compare against.
 */
export async function fetchChecksum(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CHECKSUM_FETCH_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await delay(attempt * 1000);
    }

    const controller = new AbortController();

    setTimeoutFor(controller, 60 * 1000);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const body = await response.text();
      const checksum = body.trim().split(/\s+/)[0]?.toLowerCase();

      if (!checksum || !/^[0-9a-f]{64}$/.test(checksum)) {
        throw new Error(`not a SHA-256 digest: ${JSON.stringify(body.slice(0, 128))}`);
      }

      return checksum;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `unable to fetch the mandatory SHA-256 checksum from ${url} after ${CHECKSUM_FETCH_ATTEMPTS} attempts: ${lastError}`,
  );
}

/**
 * Whether a URL resolves to anything, telling "never published" apart from
 * "cannot tell right now".
 *
 * Not every platform and architecture exists for every release - kubectl
 * v1.22.17 has no windows/arm64 - and a variant a vendor never built is data
 * rather than a failure. Only a 404 is allowed to mean that. A timeout or a
 * 503 throws, because treating either as absence would silently drop a pin
 * that should exist.
 */
export async function resourceExists(url: string): Promise<boolean> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CHECKSUM_FETCH_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await delay(attempt * 1000);
    }

    const controller = new AbortController();

    setTimeoutFor(controller, 60 * 1000);

    try {
      const response = await fetch(url, { method: "HEAD", signal: controller.signal });

      if (response.status === 404) {
        return false;
      }

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`unable to tell whether ${url} exists after ${CHECKSUM_FETCH_ATTEMPTS} attempts: ${lastError}`);
}

/** Fetches a small file, such as a signature or certificate, into memory. */
export async function fetchBytes(url: string, timeout = 60 * 1000): Promise<Buffer> {
  const controller = new AbortController();

  setTimeoutFor(controller, timeout);

  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Streams a URL to disk and returns its SHA-256.
 *
 * The lock generator needs the bytes on disk rather than just a digest, because
 * the PGP and cosign checks both verify a file.
 */
export async function downloadToFile(url: string, destination: string): Promise<string> {
  const controller = new AbortController();

  setTimeoutFor(controller, 15 * 60 * 1000);

  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error(`${url}: no body on stream`);
  }

  const hash = createHash("sha256");
  const file = createWriteStream(destination);

  await pipeline(
    response.body,
    new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        this.push(chunk);
        callback();
      },
    }),
    file,
  );

  return hash.digest("hex");
}
