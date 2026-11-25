/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createServer as createHttpServer, type Server as HttpServer, type IncomingMessage } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { connect, createServer as createNetServer, type Server as NetServer, type Socket } from "node:net";
import { fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import caCertificatesInjectable from "../../common/certificate/ca-certificates.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { testCertificate } from "../../test-utils/test-certificate";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import httpsAgentInjectable from "./https-agent.injectable";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";

import type { DiContainer } from "@ogre-tools/injectable";

describe("the dispatcher of the requests of the main process, through a proxy", () => {
  let di: DiContainer;
  let target: HttpsServer;
  let socks: NetServer;
  let httpProxy: HttpServer;
  let httpsProxy: HttpsServer;
  let targetUrl: string;
  // What each proxy was asked to reach, in the order it was asked.
  let reached: string[];
  const sockets = new Set<Duplex>();

  const portOf = (server: NetServer) => (server.address() as AddressInfo).port;
  const listen = (server: NetServer) => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const tunnel = (client: Duplex, host: string, port: number, ready: () => void) => {
    const upstream = connect(port, host, () => {
      ready();
      upstream.pipe(client);
      client.pipe(upstream);
    });

    sockets.add(upstream);
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  };
  // A proxy of the CONNECT method of HTTP, over plain text or over TLS.
  const onConnect = (kind: string) => (request: IncomingMessage, client: Duplex, head: Buffer) => {
    const [host, port] = (request.url ?? "").split(":");

    sockets.add(client);
    reached.push(`${kind} ${host}:${port}`);
    tunnel(client, host, Number(port), () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      client.write(head);
    });
  };

  beforeEach(async () => {
    reached = [];
    target = createHttpsServer({ key: testCertificate.private, cert: testCertificate.cert }, (_request, response) =>
      response.end("behind the proxy"),
    );
    // A SOCKS5 proxy with no authentication, which only connects, and closes on what is not SOCKS5.
    socks = createNetServer((client: Socket) => {
      sockets.add(client);
      client.once("data", (greeting) => {
        if (greeting[0] !== 5) {
          client.destroy();

          return;
        }
        client.write(Buffer.from([5, 0]));
        client.once("data", (request) => {
          const ipv4 = request[3] === 1;
          const host = ipv4 ? [...request.subarray(4, 8)].join(".") : request.subarray(5, 5 + request[4]).toString();
          const port = request.readUInt16BE(ipv4 ? 8 : 5 + request[4]);

          reached.push(`socks5 ${host}:${port}`);
          tunnel(client, host, port, () => client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0])));
        });
      });
    });
    httpProxy = createHttpServer().on("connect", onConnect("http"));
    httpsProxy = createHttpsServer({ key: testCertificate.private, cert: testCertificate.cert }).on(
      "connect",
      onConnect("https"),
    );

    await Promise.all([target, socks, httpProxy, httpsProxy].map(listen));
    targetUrl = `https://127.0.0.1:${portOf(target)}/`;
    di = getDiForUnitTesting();
    di.override(caCertificatesInjectable, () => [testCertificate.cert]);
  });

  afterEach(async () => {
    await di.inject(httpsAgentInjectable)().destroy();

    for (const socket of sockets) socket.destroy();
    sockets.clear();
    await Promise.all(
      [target, socks, httpProxy, httpsProxy].map((server) => new Promise((resolve) => server.close(resolve))),
    );
  });

  const fetchThrough = async (proxy: string, allowUntrustedCAs = false) => {
    const state = di.inject(userPreferencesStateInjectable);

    state.httpsProxy = proxy;
    state.allowUntrustedCAs = allowUntrustedCAs;

    const response = await undiciFetch(targetUrl, { dispatcher: di.inject(httpsAgentInjectable)() });

    return response.text();
  };

  it("reaches a server through a SOCKS5 proxy, which it speaks to in plain text", async () => {
    expect(await fetchThrough(`socks5://127.0.0.1:${portOf(socks)}`)).toBe("behind the proxy");
    expect(reached).toEqual([`socks5 127.0.0.1:${portOf(target)}`]);
  });

  it("trusts the certificate authorities of Freelens for the server behind an http:// proxy", async () => {
    expect(await fetchThrough(`http://127.0.0.1:${portOf(httpProxy)}`)).toBe("behind the proxy");
    expect(reached).toEqual([`http 127.0.0.1:${portOf(target)}`]);
  });

  it("speaks TLS to an https:// proxy, trusting it and the server behind it by the same authorities", async () => {
    expect(await fetchThrough(`https://127.0.0.1:${portOf(httpsProxy)}`)).toBe("behind the proxy");
    expect(reached).toEqual([`https 127.0.0.1:${portOf(target)}`]);
  });

  describe("when the authority of the server behind the proxy is not one Freelens trusts", () => {
    beforeEach(() => {
      di.override(caCertificatesInjectable, () => []);
    });

    it("refuses the server", async () => {
      await expect(fetchThrough(`socks5://127.0.0.1:${portOf(socks)}`)).rejects.toThrow("fetch failed");
    });

    it("reaches it when untrusted certificate authorities are allowed", async () => {
      expect(await fetchThrough(`socks5://127.0.0.1:${portOf(socks)}`, true)).toBe("behind the proxy");
      expect(await fetchThrough(`http://127.0.0.1:${portOf(httpProxy)}`, true)).toBe("behind the proxy");
    });
  });
});
