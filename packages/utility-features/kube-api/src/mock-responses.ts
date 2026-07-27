/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Headers } from "undici";
import { type Mocked, vi } from "vitest";

import type { Response } from "undici";

/**
 * A `ReadableStream` a test can push to, standing in for the WHATWG body undici
 * hands back. `destroy` mirrors what aborting a request does to the body: the
 * stream errors rather than ending cleanly.
 */
export class MockResponseStream {
  readonly stream: ReadableStream<Uint8Array>;

  #controller!: ReadableStreamDefaultController<Uint8Array>;
  #encoder = new TextEncoder();
  #destroyed = false;

  constructor() {
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.#controller = controller;
      },
    });
  }

  get destroyed() {
    return this.#destroyed;
  }

  push(chunk: string) {
    this.#controller.enqueue(this.#encoder.encode(chunk));
  }

  end() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#controller.close();
  }

  destroy() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#controller.error(new Error("stream destroyed"));
  }
}

const unsupported = (name: string) =>
  vi.fn(async (): Promise<never> => {
    throw new Error(`${name}() is not supported`);
  });

const createMockResponse = (
  url: string,
  statusCode: number,
  body: ReadableStream<Uint8Array> | null,
  text: () => Promise<string>,
): Mocked<Response> => {
  const res = {
    arrayBuffer: unsupported("arrayBuffer"),
    blob: unsupported("blob"),
    body,
    bodyUsed: false,
    bytes: unsupported("bytes"),
    clone: vi.fn(() => res),
    formData: unsupported("formData"),
    headers: new Headers(),
    json: vi.fn(async () => JSON.parse(await res.text())),
    ok: 200 <= statusCode && statusCode < 300,
    redirected: 300 <= statusCode && statusCode < 400,
    status: statusCode,
    statusText: "some-text",
    text: vi.fn(text),
    textStream: vi.fn(() => {
      throw new Error("textStream() is not supported");
    }),
    type: "basic",
    url,
  } as unknown as Mocked<Response>;

  return res;
};

export const createMockResponseFromString = (url: string, data: string, statusCode = 200) =>
  createMockResponse(url, statusCode, null, async () => data);

export const createMockResponseFromStream = (url: string, stream: MockResponseStream, statusCode = 200) =>
  createMockResponse(url, statusCode, stream.stream, async () => {
    const decoder = new TextDecoder();
    const reader = stream.stream.getReader();
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  });
