/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../getDiForUnitTesting";
import downloadBinaryInjectable from "./download-binary.injectable";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { FetchResponse } from "@freelensapp/json-api";

import type { DiContainer } from "@ogre-tools/injectable";

import type { DownloadBinary, DownloadProgress } from "./download-binary.injectable";

const url = "https://dl.k8s.io/release/v9.9.9/bin/linux/amd64/kubectl";
const chunks = [Buffer.from("the first part of "), Buffer.from("a binary")];
const content = Buffer.concat(chunks);

/**
 * A `ReadableStream` the test pushes to, standing in for the WHATWG body a
 * `fetch` response carries. `destroy` mirrors what an aborted request does to
 * it: the stream errors instead of ending cleanly.
 */
class FakeBody {
  readonly stream: ReadableStream<Uint8Array>;
  destroyed = false;

  #controller!: ReadableStreamDefaultController<Uint8Array>;

  constructor() {
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.#controller = controller;
      },
    });
  }

  push(chunk: Buffer | null) {
    if (chunk === null) {
      return this.end();
    }

    this.#controller.enqueue(new Uint8Array(chunk));
  }

  end() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.#controller.close();
  }

  destroy(error: Error) {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.#controller.error(error);
  }
}

interface FakeResponseOptions {
  body?: FakeBody;
  contentLength?: string;
  status?: number;
  statusText?: string;
}

describe("download-binary", () => {
  let di: DiContainer;
  let downloadBinary: DownloadBinary;

  const respondWith = ({ body, contentLength, status = 200, statusText = "OK" }: FakeResponseOptions) => {
    const fetch = vi.fn(async (_url: unknown, init?: { signal?: AbortSignal }) => {
      // the client destroys the body when the signal aborts; without this the
      // stall timeout could not be observed by a consumer of the stream.
      init?.signal?.addEventListener("abort", () => body?.destroy(new Error(String(init.signal?.reason))));

      return {
        status,
        statusText,
        body: body?.stream ?? null,
        headers: {
          get: (name: string) => (name === "content-length" ? (contentLength ?? null) : null),
        },
        arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
      } as Partial<FetchResponse> as FetchResponse;
    });

    // A fresh container per response: an injectable cannot be overridden once
    // it has been injected.
    di = getDiForUnitTesting();
    di.override(proxyFetchInjectable, () => fetch as never);
    downloadBinary = di.inject(downloadBinaryInjectable);

    return fetch;
  };

  const streamOf = (parts: Buffer[], { end = true } = {}) => {
    const body = new FakeBody();

    for (const part of parts) {
      body.push(part);
    }

    if (end) {
      body.end();
    }

    return body;
  };

  it("returns the same bytes whether or not the body is streamed", async () => {
    respondWith({});

    const withoutProgress = await downloadBinary(url);

    respondWith({ body: streamOf(chunks), contentLength: String(content.length) });

    const withProgress = await downloadBinary(url, { onProgress: () => {} });

    expect(withoutProgress).toEqual({ callWasSuccessful: true, response: content });
    expect(withProgress).toEqual({ callWasSuccessful: true, response: content });
  });

  it("reports progress that increases monotonically up to the total", async () => {
    respondWith({ body: streamOf(chunks), contentLength: String(content.length) });

    const progress: DownloadProgress[] = [];

    await downloadBinary(url, { onProgress: (p) => progress.push(p) });

    const transferred = progress.map((p) => p.transferred);

    expect(progress[0]).toEqual({ transferred: 0, total: content.length });
    expect(transferred).toEqual([...transferred].sort((a, b) => a - b));
    expect(new Set(transferred).size).toBe(transferred.length);
    expect(progress.at(-1)).toEqual({ transferred: content.length, total: content.length });
  });

  it("leaves the total out when the server sends no content-length", async () => {
    respondWith({ body: streamOf(chunks) });

    const progress: DownloadProgress[] = [];

    await downloadBinary(url, { onProgress: (p) => progress.push(p) });

    expect(progress.every(({ total }) => total === undefined)).toBe(true);
  });

  it("fails rather than throwing when the stream errors mid-body", async () => {
    const stream = streamOf([chunks[0]], { end: false });

    respondWith({ body: stream, contentLength: String(content.length) });

    const result = downloadBinary(url, { onProgress: () => {} });

    await new Promise((resolve) => setImmediate(resolve));
    stream.destroy(new Error("socket hang up"));

    expect(await result).toEqual({ callWasSuccessful: false, error: expect.stringContaining("socket hang up") });
  });

  it("aborts a download that stops making progress", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    try {
      const stream = streamOf([chunks[0]], { end: false });

      respondWith({ body: stream, contentLength: String(content.length) });

      const result = downloadBinary(url, { onProgress: () => {}, stallTimeout: 30_000 });

      // The first chunk arrives and re-arms the timer, so nothing has aborted
      // by the time the original deadline would have passed.
      await vi.advanceTimersByTimeAsync(29_000);
      expect(stream.destroyed).toBe(false);

      await vi.advanceTimersByTimeAsync(2_000);

      expect(await result).toEqual({
        callWasSuccessful: false,
        error: expect.stringContaining("Operation stalled"),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not abort a download that keeps making progress", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    try {
      const stream = streamOf([chunks[0]], { end: false });

      respondWith({ body: stream, contentLength: String(content.length) });

      const result = downloadBinary(url, { onProgress: () => {}, stallTimeout: 30_000 });

      await vi.advanceTimersByTimeAsync(20_000);
      stream.push(chunks[1]);
      await vi.advanceTimersByTimeAsync(20_000);
      stream.push(null);
      await vi.advanceTimersByTimeAsync(0);

      expect(await result).toEqual({ callWasSuccessful: true, response: content });
    } finally {
      vi.useRealTimers();
    }
  });
});
