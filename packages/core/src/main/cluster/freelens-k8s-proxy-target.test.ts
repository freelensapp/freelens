/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { once } from "node:events";
import http2 from "node:http2";
import https from "node:https";
import { fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testCertificate } from "../../test-utils/test-certificate";
import {
  apiTargetOptions,
  createFreelensK8sProxyAgent,
  dispatcherFor,
  freelensK8sProxyAgentOptions,
} from "./freelens-k8s-proxy-target";
import type http from "node:http";
import type net from "node:net";

import type { Agent, Dispatcher } from "undici";

interface Received {
  httpVersion: string;
  headers: http.IncomingHttpHeaders;
}

describe("the target options of freelens-k8s-proxy", () => {
  let agent: Agent;
  let dispatcher: Dispatcher;
  let received: Received[];
  let origin: string;

  const listen = async (server: http2.Http2SecureServer | https.Server) => {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    return `https://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
  };

  const handle = (req: http.IncomingMessage | http2.Http2ServerRequest, res: { end: (body: string) => void }) => {
    received.push({ httpVersion: req.httpVersion, headers: req.headers });
    res.end("some-body");
  };

  beforeEach(() => {
    agent = createFreelensK8sProxyAgent(testCertificate.cert);
    dispatcher = dispatcherFor(agent);
    received = [];
  });

  afterEach(async () => {
    await agent.destroy();
  });

  it("keeps a response open for as long as it is quiet, leaving the timeout to freelens-proxy", () => {
    expect(freelensK8sProxyAgentOptions("some-cert")).toEqual({
      connect: { ca: "some-cert" },
      bodyTimeout: 0,
      h2Options: { maxConcurrentStreams: 1000 },
    });
  });

  it("forwards with undici's own fetch, and passes redirects to the client", () => {
    const target = new URL("https://127.0.0.1:9001/some-api-prefix");
    const options = apiTargetOptions({ target, dispatcher, timeout: 30_000 });

    expect(options).toEqual({
      target,
      timeout: 30_000,
      fetch: undiciFetch,
      fetchOptions: { requestOptions: { dispatcher, redirect: "manual" } },
    });
  });

  describe("given a target that offers HTTP/2", () => {
    let server: http2.Http2SecureServer;
    let sessions: http2.ServerHttp2Session[];

    beforeEach(async () => {
      sessions = [];
      server = http2.createSecureServer(
        {
          key: testCertificate.private,
          cert: testCertificate.cert,
          allowHTTP1: true,
          // As freelens-k8s-proxy allows
          settings: { maxConcurrentStreams: 1000 },
        },
        handle,
      );
      server.on("session", (session) => sessions.push(session));
      origin = await listen(server);
    });

    afterEach(() => {
      for (const session of sessions) {
        session.destroy();
      }

      server.close();
    });

    it("talks HTTP/2 to it, as to the host of the proxy", async () => {
      const response = await undiciFetch(`${origin}/some-path`, { dispatcher });

      expect(await response.text()).toBe("some-body");
      expect(received).toEqual([
        expect.objectContaining({
          httpVersion: "2.0",
          headers: expect.objectContaining({ ":authority": new URL(origin).host }),
        }),
      ]);
    });

    it("does not forward a host given below fetch, which drops it itself", async () => {
      const { body } = await dispatcher.request({
        origin,
        path: "/some-path",
        method: "GET",
        headers: { host: "some-api-server" },
      });

      await body.text();

      expect(received).toEqual([
        expect.objectContaining({ headers: expect.objectContaining({ ":authority": new URL(origin).host }) }),
      ]);
    });

    it("sends more requests at once than undici allows by default over one connection", async () => {
      await Promise.all(
        Array.from({ length: 150 }, async () => (await undiciFetch(`${origin}/some-path`, { dispatcher })).text()),
      );

      expect(received).toHaveLength(150);
      expect(sessions).toHaveLength(1);
    });

    it("does not forward the headers of the connection, nor the encodings the client accepts", async () => {
      await (
        await undiciFetch(`${origin}/some-path`, {
          dispatcher,
          headers: {
            connection: "keep-alive, x-some-hop-by-hop-header",
            "keep-alive": "timeout=5",
            "x-some-hop-by-hop-header": "some-value",
            "proxy-connection": "keep-alive",
            te: "trailers",
            "accept-encoding": "gzip, br",
            "x-some-header": "some-value",
          },
        })
      ).text();

      const [{ headers }] = received;

      expect(headers["x-some-header"]).toBe("some-value");

      for (const name of [
        "connection",
        "keep-alive",
        "x-some-hop-by-hop-header",
        "proxy-connection",
        "te",
        "accept-encoding",
      ]) {
        expect(headers).not.toHaveProperty(name);
      }
    });

    it("forwards a body, which undici would refuse to send with a transfer-encoding", async () => {
      await (
        await undiciFetch(`${origin}/some-path`, {
          dispatcher,
          method: "POST",
          body: "some-request-body",
          headers: { "transfer-encoding": "chunked", expect: "100-continue" },
        })
      ).text();

      expect(received).toHaveLength(1);
      expect(received[0].headers).not.toHaveProperty("transfer-encoding");
      expect(received[0].headers).not.toHaveProperty("expect");
    });
  });

  describe("given a target that offers only HTTP/1.1", () => {
    let server: https.Server;

    beforeEach(async () => {
      server = https.createServer({ key: testCertificate.private, cert: testCertificate.cert }, handle);
      origin = await listen(server);
    });

    afterEach(() => {
      server.closeAllConnections();
      server.close();
    });

    it("falls back to HTTP/1.1, as to the host of the proxy", async () => {
      const response = await undiciFetch(`${origin}/some-path`, { dispatcher });

      expect(await response.text()).toBe("some-body");
      expect(received).toEqual([
        expect.objectContaining({
          httpVersion: "1.1",
          headers: expect.objectContaining({ host: new URL(origin).host }),
        }),
      ]);
    });
  });
});
