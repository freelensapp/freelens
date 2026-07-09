/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Headers as NodeFetchHeaders, Response } from "node-fetch";
import { PassThrough } from "stream";
import { type Mocked, vi } from "vitest";

export const createMockResponseFromString = (url: string, data: string, statusCode = 200) => {
  const res: Mocked<Response> = {
    buffer: vi.fn(async () => {
      throw new Error("buffer() is not supported");
    }),
    clone: vi.fn(() => res),
    arrayBuffer: vi.fn(async () => {
      throw new Error("arrayBuffer() is not supported");
    }),
    blob: vi.fn(async () => {
      throw new Error("blob() is not supported");
    }),
    body: new PassThrough(),
    bodyUsed: false,
    headers: new NodeFetchHeaders(),
    json: vi.fn(async () => JSON.parse(await res.text())),
    ok: 200 <= statusCode && statusCode < 300,
    redirected: 300 <= statusCode && statusCode < 400,
    size: data.length,
    status: statusCode,
    statusText: "some-text",
    text: vi.fn(async () => data),
    type: "basic",
    url,
    formData: vi.fn(async () => {
      throw new Error("formData() is not supported");
    }),
  };

  return res;
};

export const createMockResponseFromStream = (url: string, stream: NodeJS.ReadableStream, statusCode = 200) => {
  const res: Mocked<Response> = {
    buffer: vi.fn(async () => {
      throw new Error("buffer() is not supported");
    }),
    clone: vi.fn(() => res),
    arrayBuffer: vi.fn(async () => {
      throw new Error("arrayBuffer() is not supported");
    }),
    blob: vi.fn(async () => {
      throw new Error("blob() is not supported");
    }),
    body: stream,
    bodyUsed: false,
    headers: new NodeFetchHeaders(),
    json: vi.fn(async () => JSON.parse(await res.text())),
    ok: 200 <= statusCode && statusCode < 300,
    redirected: 300 <= statusCode && statusCode < 400,
    size: 10,
    status: statusCode,
    statusText: "some-text",
    text: vi.fn(() => {
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });
    }),
    type: "basic",
    url,
    formData: vi.fn(async () => {
      throw new Error("formData() is not supported");
    }),
  };

  return res;
};
