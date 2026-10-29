/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 *
 * @vitest-environment node
 */

import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect, createServer as createNetServer } from "node:net";
import { fetch as undiciFetch } from "undici";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { testCertificate } from "../../test-utils/test-certificate";
import { createHttpsProxyAgent } from "./https-proxy-agent";
import type { AddressInfo, Server, Socket } from "node:net";

import type { ProxyAgent } from "undici";

const listen = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  return (server.address() as AddressInfo).port;
};

const close = (server: Server) => new Promise((resolve) => server.close(resolve));

const pipeTo = (client: Socket, host: string, port: number, onConnected: () => void) => {
  const upstream = connect(port, host, () => {
    onConnected();
    client.pipe(upstream).pipe(client);
  });

  upstream.on("error", () => client.destroy());
  client.on("error", () => upstream.destroy());
};

/**
 * A SOCKS5 server with no authentication that handles `CONNECT` only, and
 * records the first byte of every connection: 0x05 for a SOCKS5 greeting.
 */
const createSocks5Server = (firstBytes: number[]) =>
  createNetServer((client) => {
    client.once("data", (greeting) => {
      firstBytes.push(greeting[0]);

      if (greeting[0] !== 0x05) {
        client.destroy();

        return;
      }

      client.write(Buffer.from([0x05, 0x00]));
      client.once("data", (request) => {
        const addressType = request[3];
        const [host, end] =
          addressType === 0x01
            ? [request.subarray(4, 8).join("."), 8]
            : [request.subarray(5, 5 + request[4]).toString(), 5 + request[4]];

        pipeTo(client, host, request.readUInt16BE(end), () =>
          client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0])),
        );
      });
    });
    client.on("error", () => {});
  });

const asConnectProxy = <S extends Server>(server: S) => {
  server.on("connect", (request: { url?: string }, client: Socket) => {
    const [host, port] = (request.url ?? "").split(":");

    pipeTo(client, host, Number(port), () => client.write("HTTP/1.1 200 Connection Established\r\n\r\n"));
  });

  return server;
};

describe("createHttpsProxyAgent", () => {
  let certificate: string;
  let target: Server;
  let url: string;
  let connectProxy: Server;
  let connectProxyUrl: string;
  let tlsConnectProxy: Server;
  let tlsConnectProxyUrl: string;
  let socks5Proxy: Server;
  let socks5Port: number;
  let socks5FirstBytes: number[];
  let agent: ProxyAgent | undefined;

  beforeAll(async () => {
    const { cert, private: key } = testCertificate;

    certificate = cert;
    target = createHttpsServer({ cert, key }, (req, res) => res.end("some-response"));
    url = `https://127.0.0.1:${await listen(target)}/`;
    connectProxy = asConnectProxy(createHttpServer());
    connectProxyUrl = `http://127.0.0.1:${await listen(connectProxy)}`;
    tlsConnectProxy = asConnectProxy(createHttpsServer({ cert, key }));
    tlsConnectProxyUrl = `https://127.0.0.1:${await listen(tlsConnectProxy)}`;
    socks5FirstBytes = [];
    socks5Proxy = createSocks5Server(socks5FirstBytes);
    socks5Port = await listen(socks5Proxy);
  });

  afterEach(async () => {
    await agent?.destroy();
    agent = undefined;
    socks5FirstBytes.length = 0;
  });

  afterAll(async () => {
    await Promise.all([close(target), close(connectProxy), close(tlsConnectProxy), close(socks5Proxy)]);
  });

  const fetchThrough = async (proxy: string, tls: Parameters<typeof createHttpsProxyAgent>[1]) => {
    agent = createHttpsProxyAgent(proxy, tls);

    const response = await undiciFetch(url, { dispatcher: agent });

    return response.text();
  };

  describe("through an HTTP proxy", () => {
    it("trusts the server by the given CA certificates", async () => {
      expect(await fetchThrough(connectProxyUrl, { ca: certificate, rejectUnauthorized: true })).toBe("some-response");
    });

    it("accepts an untrusted server when rejectUnauthorized is false", async () => {
      expect(await fetchThrough(connectProxyUrl, { rejectUnauthorized: false })).toBe("some-response");
    });

    it("refuses an untrusted server when rejectUnauthorized is true", async () => {
      await expect(fetchThrough(connectProxyUrl, { rejectUnauthorized: true })).rejects.toThrow();
    });
  });

  describe("through an HTTPS proxy", () => {
    it("trusts the proxy and the server by the given CA certificates", async () => {
      expect(await fetchThrough(tlsConnectProxyUrl, { ca: certificate, rejectUnauthorized: true })).toBe(
        "some-response",
      );
    });

    it("accepts an untrusted proxy and server when rejectUnauthorized is false", async () => {
      expect(await fetchThrough(tlsConnectProxyUrl, { rejectUnauthorized: false })).toBe("some-response");
    });

    it("refuses an untrusted proxy when rejectUnauthorized is true", async () => {
      await expect(fetchThrough(tlsConnectProxyUrl, { rejectUnauthorized: true })).rejects.toThrow();
    });
  });

  describe("through a SOCKS5 proxy", () => {
    it.each(["socks5", "socks5h", "socks"])("speaks SOCKS5 to a %s: proxy", async (scheme) => {
      expect(
        await fetchThrough(`${scheme}://127.0.0.1:${socks5Port}`, { ca: certificate, rejectUnauthorized: true }),
      ).toBe("some-response");
      expect(socks5FirstBytes).toEqual([0x05]);
    });

    it("accepts an untrusted server when rejectUnauthorized is false", async () => {
      expect(await fetchThrough(`socks5://127.0.0.1:${socks5Port}`, { rejectUnauthorized: false })).toBe(
        "some-response",
      );
    });

    it("refuses an untrusted server when rejectUnauthorized is true", async () => {
      await expect(fetchThrough(`socks5://127.0.0.1:${socks5Port}`, { rejectUnauthorized: true })).rejects.toThrow();
    });
  });

  it("names the scheme it does not support", () => {
    expect(() => createHttpsProxyAgent("socks4://127.0.0.1:1080", {})).toThrow(/"socks4:"/);
  });
});
