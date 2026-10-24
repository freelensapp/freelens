/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createServer, type Server } from "node:https";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { Agent, fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testCertificate } from "../../test-utils/test-certificate";
import { BrotliRefusedError, withBrotliRefused } from "./refuse-brotli";
import type { AddressInfo } from "node:net";

describe("withBrotliRefused", () => {
  let server: Server;
  let url: string;
  let agent: Agent;
  let acceptEncoding: string | undefined;

  beforeEach(async () => {
    acceptEncoding = undefined;
    server = createServer({ key: testCertificate.private, cert: testCertificate.cert }, (req, res) => {
      const body = "some-body";

      acceptEncoding = req.headers["accept-encoding"];

      switch (req.url) {
        // A server that compresses with what the client accepts, Brotli first
        case "/negotiated":
          if (acceptEncoding?.includes("br")) {
            res.writeHead(200, { "content-encoding": "br" }).end(brotliCompressSync(body));
          } else {
            res.writeHead(200, { "content-encoding": "gzip" }).end(gzipSync(body));
          }
          break;
        // Servers that send Brotli whatever the client accepts
        case "/br":
          res.writeHead(200, { "content-encoding": "br" }).end(brotliCompressSync(body));
          break;
        case "/gzip-br":
          res.writeHead(200, { "content-encoding": "gzip, BR" }).end(brotliCompressSync(gzipSync(body)));
          break;
        default:
          res.end(body);
      }
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    url = `https://127.0.0.1:${(server.address() as AddressInfo).port}`;
    agent = new Agent({ connect: { ca: testCertificate.cert } });
  });

  afterEach(async () => {
    await agent.destroy();
    await new Promise((resolve) => server.close(resolve));
  });

  it("asks for no Brotli where fetch would, so a server that supports it answers with another coding", async () => {
    const response = await undiciFetch(`${url}/negotiated`, { dispatcher: withBrotliRefused(agent) });

    expect(await response.text()).toBe("some-body");
    expect(acceptEncoding).toBe("gzip, deflate, zstd");
  });

  it.each([
    ["br;q=1.0, gzip;q=0.5", "gzip;q=0.5"],
    ["BR", "identity"],
    ["gzip", "gzip"],
  ])("sends Accept-Encoding %j as %j", async (asked, sent) => {
    await undiciFetch(url, { dispatcher: withBrotliRefused(agent), headers: { "accept-encoding": asked } });

    expect(acceptEncoding).toBe(sent);
  });

  it.each(["/br", "/gzip-br"])("refuses a response encoded with Brotli nevertheless, %s", async (path) => {
    const failure = await undiciFetch(`${url}${path}`, { dispatcher: withBrotliRefused(agent) }).then(
      () => undefined,
      (error: TypeError) => error,
    );

    expect(failure?.cause).toBeInstanceOf(BrotliRefusedError);
  });

  it("passes a response without Brotli on", async () => {
    const response = await undiciFetch(`${url}/plain`, { dispatcher: withBrotliRefused(agent) });

    expect(await response.text()).toBe("some-body");
  });

  it("composes onto a dispatcher once", () => {
    expect(withBrotliRefused(agent)).toBe(withBrotliRefused(agent));
  });
});
