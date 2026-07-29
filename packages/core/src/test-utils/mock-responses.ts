/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { FetchResponse as Response } from "@freelensapp/json-api";

import type { Mocked } from "vitest";

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

export const createMockResponseFromStream = (url: string, stream: ReadableStream<Uint8Array>, statusCode = 200) =>
  createMockResponse(url, statusCode, stream, async () => {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
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
