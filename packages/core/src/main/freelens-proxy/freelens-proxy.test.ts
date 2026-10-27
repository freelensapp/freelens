/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { once } from "node:events";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import tls from "node:tls";
import { loggerInjectionToken } from "@freelensapp/logger";
import { Agent, fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import { nodeEnvInjectionToken } from "../../common/vars/node-env-injection-token";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import { testCertificate } from "../../test-utils/test-certificate";
import freelensK8sProxyManagerInjectable from "../cluster/freelens-k8s-proxy-manager.injectable";
import { apiTargetOptions, createFreelensK8sProxyAgent, dispatcherFor } from "../cluster/freelens-k8s-proxy-target";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import routerInjectable from "../router/router.injectable";
import freelensProxyInjectable from "./freelens-proxy.injectable";
import freelensProxyPortInjectable from "./freelens-proxy-port.injectable";
import freelensProxyTokenInjectable from "./freelens-proxy-token.injectable";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";
import type net from "node:net";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { Cluster } from "../../common/cluster/cluster";
import type { FreelensK8sProxyManager } from "../cluster/freelens-k8s-proxy-manager.injectable";
import type { Router } from "../router/router";
import type { ServerIncomingMessage, ServerResponse } from "./freelens-proxy";

const overrideEnvironment = (di: DiContainer) => {
  di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
  di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
  di.override(freelensProxyCertificateInjectable, () => ({ get: () => testCertificate, set: () => {} }));
};

/**
 * A TLS connection that offers only HTTP/1.1, as a client without HTTP/2
 * support does.
 */
const connectHttp1 = async (port: number) => {
  const socket = tls.connect({ port, host: "127.0.0.1", rejectUnauthorized: false, ALPNProtocols: ["http/1.1"] });

  await once(socket, "secureConnect");

  return socket;
};

const connectHttp2 = async (port: number) => {
  const session = http2.connect(`https://127.0.0.1:${port}`, { rejectUnauthorized: false });

  await once(session, "connect");

  return session;
};

/**
 * Resolves once the stream or socket has closed, whether or not it errored on
 * the way, which `once(emitter, "close")` would reject on.
 */
const untilClosed = (emitter: NodeJS.EventEmitter) =>
  new Promise<void>((resolve) => {
    emitter.on("error", () => {});
    emitter.once("close", () => resolve());
  });

/**
 * The token the proxy expects, set by each describe from its own container.
 * The helpers add it as the bearer token unless a test sets `authorization`
 * itself, so the requests of the tests reach the guarded routes.
 */
let proxyToken = "";

const withAuth = (headers: http.OutgoingHttpHeaders): http.OutgoingHttpHeaders => ({
  ...(proxyToken ? { authorization: `Bearer ${proxyToken}` } : {}),
  ...headers,
});

const getHttp1 = (port: number, path: string, headers: http.OutgoingHttpHeaders = {}) =>
  new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    https
      .get(
        { host: "127.0.0.1", port, path, agent: false, rejectUnauthorized: false, headers: withAuth(headers) },
        (res) => {
          let body = "";

          res.setEncoding("utf8");
          res.on("data", (chunk: string) => (body += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body }));
        },
      )
      .on("error", reject);
  });

const getHttp2 = (session: http2.ClientHttp2Session, path: string, headers: http2.OutgoingHttpHeaders = {}) =>
  new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const stream = session.request({ ":path": path, ...withAuth(headers) });
    let statusCode: number | undefined;
    let body = "";

    stream.setEncoding("utf8");
    stream.on("response", (responseHeaders) => (statusCode = responseHeaders[":status"]));
    stream.on("data", (chunk: string) => (body += chunk));
    stream.on("end", () => resolve({ statusCode, body }));
    stream.on("error", reject);
  });

const getHeadersHttp1 = (port: number, path: string) =>
  new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
    https
      .get({ host: "127.0.0.1", port, path, agent: false, rejectUnauthorized: false, headers: withAuth({}) }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.headers));
      })
      .on("error", reject);
  });

const getHeadersHttp2 = (session: http2.ClientHttp2Session, path: string) =>
  new Promise<http2.IncomingHttpHeaders>((resolve, reject) => {
    const stream = session.request({ ":path": path, ...withAuth({}) });
    let headers: http2.IncomingHttpHeaders = {};

    stream.on("response", (responseHeaders) => (headers = responseHeaders));
    stream.resume();
    stream.on("end", () => resolve(headers));
    stream.on("error", reject);
  });

describe("closing the Freelens proxy", () => {
  let di: DiContainer;
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let requestReachedTheRouter: Promise<void>;
  let upgradeReachedTheShell: Promise<void>;
  const sockets: net.Socket[] = [];
  const sessions: http2.ClientHttp2Session[] = [];
  const answeredPath = "/some-answered-path";

  const connect = async () => {
    const socket = await connectHttp1(port);

    sockets.push(socket);

    return socket;
  };

  const connectSession = async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    return session;
  };

  const request = (socket: net.Socket, path: string) => {
    socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`);
  };

  /**
   * Reads until the end of the response head, which for the answered route is
   * the whole response.
   */
  const readResponse = async (socket: net.Socket) => {
    let response = "";

    while (!response.includes("\r\n\r\n")) {
      const [chunk] = (await once(socket, "data")) as [Buffer];

      response += chunk.toString();
    }

    return response;
  };

  beforeEach(async () => {
    di = getDiForUnitTesting();

    overrideEnvironment(di);
    di.override(getClusterForRequestInjectable, () => () => undefined);

    // The shell session never answers, so its socket stays open, as the
    // socket of a real shell session does. Instantiating it for real pulls in
    // the whole shell session graph.
    let upgradeReceived: () => void;

    upgradeReachedTheShell = new Promise<void>((resolve) => {
      upgradeReceived = resolve;
    });
    di.override(shellApiRequestInjectable, () => () => upgradeReceived());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());

    // Every route but one never answers, standing in for the watch and follow
    // requests the proxy really carries: a connection that is not idle and
    // will not become idle on its own. The one that does answer leaves behind
    // a genuinely idle keep-alive connection.
    let requestReceived: () => void;

    requestReachedTheRouter = new Promise<void>((resolve) => {
      requestReceived = resolve;
    });
    di.override(
      routerInjectable,
      () =>
        ({
          route: (_cluster: Cluster | undefined, req: ServerIncomingMessage, res: ServerResponse) => {
            if (req.url === answeredPath) {
              res.end();

              return Promise.resolve();
            }

            requestReceived();

            return new Promise<void>(() => {});
          },
        }) as unknown as Router,
    );

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(() => {
    for (const socket of sockets) {
      socket.destroy();
    }

    for (const session of sessions) {
      session.destroy();
    }

    sockets.length = 0;
    sessions.length = 0;
  });

  it("resolves when nothing is connected", async () => {
    await expect(proxy.close()).resolves.toBeUndefined();
  });

  it("resolves without waiting out the grace period when an HTTP/1.1 connection is idle", async () => {
    const socket = await connect();

    /**
     * The request has to be driven to completion for this to test anything:
     * Node only tracks a connection from the moment a message begins on it, so
     * a socket that has merely been accepted is invisible to the closing of
     * idle connections and would be reaped by the forced destroy instead. What
     * is idle is the keep-alive connection left behind by an answered request.
     */
    request(socket, answeredPath);
    await readResponse(socket);

    const startedAt = performance.now();

    await proxy.close();

    expect(performance.now() - startedAt).toBeLessThan(400);
  });

  it("destroys an HTTP/1.1 connection that is still serving a request, once the grace period is up", async () => {
    const socket = await connect();
    const socketClosed = once(socket, "close");

    request(socket, "/some-path");
    await requestReachedTheRouter;

    const startedAt = performance.now();

    await proxy.close();

    // The request never answers, so the only way this resolved is the grace
    // period elapsing and the connection being destroyed
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(400);
    await socketClosed;
  });

  it("resolves without waiting out the grace period when an HTTP/2 session is idle", async () => {
    const session = await connectSession();
    const sessionClosed = once(session, "close");

    await getHttp2(session, answeredPath);

    const startedAt = performance.now();

    await proxy.close();

    expect(performance.now() - startedAt).toBeLessThan(400);
    await sessionClosed;
  });

  it("destroys an HTTP/2 session that still has an open stream, once the grace period is up", async () => {
    const session = await connectSession();
    const sessionClosed = once(session, "close");

    session.request({ ":path": "/some-path" }).on("error", () => {});
    await requestReachedTheRouter;

    const startedAt = performance.now();

    await proxy.close();

    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(400);
    await sessionClosed;
  });

  it("destroys the connection of an upgraded request, once the grace period is up", async () => {
    const socket = await connect();
    const socketClosed = once(socket, "close");

    socket.write(
      `GET /api?id=some-tab-id HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer ${proxyToken}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`,
    );
    await upgradeReachedTheShell;

    const startedAt = performance.now();

    await proxy.close();

    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(400);
    await socketClosed;
  });

  it("does nothing on a second call", async () => {
    await proxy.close();

    expect(proxy.close()).toBeUndefined();
  });
});

describe("Freelens proxy protocols", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    overrideEnvironment(di);
    di.override(getClusterForRequestInjectable, () => () => undefined);
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(
      routerInjectable,
      () =>
        ({
          route: async (_cluster: Cluster | undefined, req: ServerIncomingMessage, res: ServerResponse) => {
            // A response whose headers have gone out and whose body has not
            // ended yet, which is what the client then cancels
            if (req.url === "/some-open-response" && res instanceof http2.Http2ServerResponse) {
              res.writeHead(200).write("some-start");

              return;
            }

            res.end(`some-response-over-${req.httpVersion}`);
          },
        }) as unknown as Router,
    );

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    await proxy.close();
  });

  it("negotiates HTTP/2 with a client that offers it", async () => {
    const socket = tls.connect({
      port,
      host: "127.0.0.1",
      rejectUnauthorized: false,
      ALPNProtocols: ["h2", "http/1.1"],
    });

    await once(socket, "secureConnect");
    socket.destroy();

    expect(socket.alpnProtocol).toBe("h2");
  });

  it("answers a request over HTTP/2", async () => {
    const session = await connectHttp2(port);

    try {
      expect(await getHttp2(session, "/some-path")).toEqual({ statusCode: 200, body: "some-response-over-2.0" });
    } finally {
      session.destroy();
    }
  });

  it("keeps serving a session whose client has cancelled more than a thousand streams", async () => {
    const session = await connectHttp2(port);

    try {
      // As Chromium does on a reload, cancelling each module it has in its
      // cache once the headers have arrived; nghttp2 ends the session past a
      // burst of 1000 by default
      for (let batch = 0; batch < 11; batch++) {
        await Promise.all(
          Array.from({ length: 100 }, async () => {
            const stream = session.request({ ":path": "/some-open-response" });
            const closed = untilClosed(stream);

            await once(stream, "response");
            stream.close(http2.constants.NGHTTP2_CANCEL);
            await closed;
          }),
        );
      }

      expect(await getHttp2(session, "/some-path")).toEqual({ statusCode: 200, body: "some-response-over-2.0" });
    } finally {
      session.destroy();
    }
  });

  it("answers a request over HTTP/1.1 from a client that does not offer HTTP/2", async () => {
    expect(await getHttp1(port, "/some-path")).toEqual({ statusCode: 200, body: "some-response-over-1.1" });
  });

  it("tells the client not to store a response of the local router api", async () => {
    expect((await getHeadersHttp1(port, "/api/v2/releases"))["cache-control"]).toBe("no-store");
  });

  it("leaves the caching of the renderer's files to the client", async () => {
    expect((await getHeadersHttp1(port, "/some-path"))["cache-control"]).toBeUndefined();
  });
});

/**
 * freelens-k8s-proxy offers HTTP/2 and HTTP/1.1 through ALPN on its TLS
 * listener, and the target here does the same, reached as the real one is.
 */
describe("Freelens proxy kube api requests", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let target: http2.Http2SecureServer;
  let targetSessions: http2.ServerHttp2Session[];
  let targetReceived: { url?: string; host?: string; authorization?: string; origin?: string; httpVersion: string }[];
  let watchReceived: Promise<http2.Http2ServerRequest>;
  let pendingReceived: Promise<http2.Http2ServerRequest>;
  let timeout: number | undefined;
  let agent: Agent;
  let logError: Mock;
  let clusterDisconnected: boolean;
  const sessions: http2.ClientHttp2Session[] = [];

  const apiPrefix = "/some-api-prefix";

  const connectSession = async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    return session;
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    let receiveWatch: (req: http2.Http2ServerRequest) => void;
    let receivePending: (req: http2.Http2ServerRequest) => void;

    targetReceived = [];
    targetSessions = [];
    watchReceived = new Promise((resolve) => {
      receiveWatch = resolve;
    });
    pendingReceived = new Promise((resolve) => {
      receivePending = resolve;
    });
    timeout = undefined;
    target = http2.createSecureServer(
      { key: testCertificate.private, cert: testCertificate.cert, allowHTTP1: true },
      async (req, res) => {
        targetReceived.push({
          url: req.url,
          host: req.headers[":authority"] ?? req.headers.host,
          authorization: req.headers.authorization,
          origin: req.headers.origin,
          httpVersion: req.httpVersion,
        });

        // A request the target has not answered yet, not even with its headers.
        if (req.url.endsWith("/pending")) {
          receivePending(req);

          return;
        }

        // As the Kubernetes API server answers, which lets a client store the
        // response as long as it checks it before using it again.
        if (req.url.endsWith("/no-cache")) {
          res.writeHead(200, { "cache-control": "no-cache, private" }).end("some-body");

          return;
        }

        if (req.url.endsWith("/aborted")) {
          res.writeHead(200).write("some-partial-body");
          setTimeout(() => req.stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR), 10);

          return;
        }

        // A watch with no event yet: the target sends its headers at once, as
        // freelens-k8s-proxy does, and then nothing. Over HTTP/2 `writeHead`
        // sends them.
        if (req.url.includes("watch=true")) {
          res.writeHead(200, { "content-type": "application/json" });
          receiveWatch(req);

          return;
        }

        if (req.method === "POST") {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          res.end(`some-body-for-${body}`);

          return;
        }

        res.end("some-body");
      },
    );
    target.on("session", (session) => targetSessions.push(session));
    target.listen(0, "127.0.0.1");
    await once(target, "listening");

    const { port: targetPort } = target.address() as net.AddressInfo;

    agent = createFreelensK8sProxyAgent(testCertificate.cert);
    logError = vi.fn();
    clusterDisconnected = false;

    overrideEnvironment(di);
    // As the real lookup does: the `/<clusterId>/…` path of kubectl and helm is
    // rewritten to `/api-kube/…`, and a request already on `/api-kube` (a
    // cluster frame) keeps it. Anything else reaches no cluster.
    di.override(getClusterForRequestInjectable, () => (req) => {
      if (req.url?.startsWith("/some-cluster-id/")) {
        req.url = req.url.replace("/some-cluster-id", "/api-kube");
      }

      if (req.url?.startsWith("/api-kube")) {
        return { id: "some-cluster-id", disconnected: { get: () => clusterDisconnected } } as unknown as Cluster;
      }

      return undefined;
    });
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(
      freelensK8sProxyManagerInjectable,
      () =>
        ({
          getApiTarget: async () =>
            apiTargetOptions({
              target: new URL(`https://127.0.0.1:${targetPort}${apiPrefix}`),
              dispatcher: dispatcherFor(agent),
              timeout,
            }),
        }) as unknown as FreelensK8sProxyManager,
    );
    di.override(loggerInjectionToken, () => ({
      warn: vi.fn(),
      debug: vi.fn(),
      error: logError,
      info: vi.fn(),
      silly: vi.fn(),
    }));

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    for (const session of sessions) {
      session.destroy();
    }

    sessions.length = 0;
    await proxy.close();
    await agent.destroy();

    for (const session of targetSessions) {
      session.destroy();
    }

    target.close();
  });

  /**
   * Waits for the response of a watch that the client cancelled to fail on
   * its way back, which is when the proxy hears of the abort.
   */
  const afterTheAbort = () => new Promise((resolve) => setTimeout(resolve, 50));

  it.each([
    ["a kube api request", "/api-kube/api/v1/pods"],
    ["a request to the local router api", "/api/v2/releases"],
    ["the /<clusterId>/ path of kubectl and helm", "/some-cluster-id/api/v1/pods"],
  ])("answers 403 without a valid token, for %s", async (_name, path) => {
    expect(await getHttp1(port, path, { authorization: "Bearer not-the-token" })).toEqual({
      statusCode: 403,
      body: "Forbidden",
    });
    expect(targetReceived).toEqual([]);
  });

  it("tells the client not to store a kube api response over HTTP/1.1, whatever the cluster says", async () => {
    expect((await getHeadersHttp1(port, "/api-kube/api/v1/pods/no-cache"))["cache-control"]).toBe("no-store");
  });

  it("tells the client not to store a kube api response over HTTP/2, whatever the cluster says", async () => {
    const session = await connectSession();

    expect((await getHeadersHttp2(session, "/api-kube/api/v1/pods/no-cache"))["cache-control"]).toBe("no-store");
  });

  it("tells the client not to store a kube api response that says nothing of caching", async () => {
    expect((await getHeadersHttp1(port, "/api-kube/api/v1/pods"))["cache-control"]).toBe("no-store");
  });

  it("tells the client not to store a refused kube api request", async () => {
    clusterDisconnected = true;

    expect((await getHeadersHttp1(port, "/api-kube/api/v1/pods"))["cache-control"]).toBe("no-store");
  });

  it("forwards the /<clusterId>/ path of kubectl and helm with a valid token", async () => {
    const response = await getHttp1(port, "/some-cluster-id/api/v1/pods");

    expect(response).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetReceived).toHaveLength(1);
  });

  it("answers 503 for a cluster the user has not connected, without starting its proxy", async () => {
    clusterDisconnected = true;

    const response = await getHttp1(port, "/api-kube/api/v1/pods");

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toMatchObject({ kind: "Status", reason: "ServiceUnavailable", code: 503 });
    expect(targetReceived).toEqual([]);
  });

  it("answers 403 for a foreign host, even with a valid token", async () => {
    expect((await getHttp1(port, "/api-kube/api/v1/pods", { host: "evil.example.com" })).statusCode).toBe(403);
    expect(targetReceived).toEqual([]);
  });

  it("answers 403 for a foreign origin, even with a valid token", async () => {
    expect((await getHttp1(port, "/api-kube/api/v1/pods", { origin: "https://evil.example.com" })).statusCode).toBe(
      403,
    );
    expect(targetReceived).toEqual([]);
  });

  it("does not forward the origin of a frame to the cluster", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/pods", {
      origin: "https://some-cluster-id.renderer.freelens.app",
    });

    expect(response.statusCode).toBe(200);
    expect(targetReceived).toHaveLength(1);
    expect(targetReceived[0].origin).toBeUndefined();
  });

  it("forwards the request below the path of the target over HTTP/2, as a request for the target", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/pods");

    expect(response).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetReceived).toEqual([
      {
        url: `${apiPrefix}/api/v1/pods`,
        host: `127.0.0.1:${(target.address() as net.AddressInfo).port}`,
        authorization: undefined,
        httpVersion: "2.0",
      },
    ]);
  });

  it("forwards an HTTP/2 request below the path of the target, as a request for the target", async () => {
    const session = await connectSession();
    const response = await getHttp2(session, "/api-kube/api/v1/pods");

    expect(response).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetReceived).toEqual([
      {
        url: `${apiPrefix}/api/v1/pods`,
        host: `127.0.0.1:${(target.address() as net.AddressInfo).port}`,
        authorization: undefined,
        httpVersion: "2.0",
      },
    ]);
  });

  it("forwards the chunked body of an HTTP/1.1 request", async () => {
    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const req = https.request(
        {
          host: "127.0.0.1",
          port,
          path: "/api-kube/api/v1/pods",
          method: "POST",
          rejectUnauthorized: false,
          headers: { authorization: `Bearer ${proxyToken}` },
        },
        (res) => {
          let body = "";

          res.setEncoding("utf8");
          res.on("data", (chunk: string) => (body += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body }));
        },
      );

      req.on("error", reject);
      // Written in two parts, the body goes out with `transfer-encoding: chunked`
      req.write("some-");
      req.end("pod");
    });

    expect(response).toEqual({ statusCode: 200, body: "some-body-for-some-pod" });
  });

  it("sends the requests of a cluster over one connection to the target", async () => {
    const session = await connectSession();

    session
      .request({ ":path": "/api-kube/api/v1/pods?watch=true", authorization: `Bearer ${proxyToken}` })
      .on("error", () => {});
    await watchReceived;
    await Promise.all(Array.from({ length: 10 }, () => getHttp2(session, "/api-kube/api/v1/pods")));

    expect(targetSessions).toHaveLength(1);
  });

  it("keeps a watch open across a graceful GOAWAY of the target, and sends the next request over a new connection", async () => {
    const session = await connectSession();
    const watch = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });

    watch.on("error", () => {});
    watch.setEncoding("utf8");

    const req = await watchReceived;

    // As freelens-k8s-proxy does when it shuts down or closes an idle
    // connection: the streams it has already taken are still served.
    targetSessions[0].goaway(http2.constants.NGHTTP2_NO_ERROR);

    expect(await getHttp2(session, "/api-kube/api/v1/pods")).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetSessions).toHaveLength(2);

    const event = once(watch, "data");

    req.stream.write('{"type":"ADDED"}\n');

    expect(await event).toEqual(['{"type":"ADDED"}\n']);
  });

  it.each([
    ["drops its connection", (session: http2.ServerHttp2Session) => session.destroy()],
    [
      "sends a GOAWAY with an error",
      (session: http2.ServerHttp2Session) => session.goaway(http2.constants.NGHTTP2_INTERNAL_ERROR),
    ],
  ])("answers a request in flight with 500 when the target %s, and serves the next one", async (_name, fail) => {
    const session = await connectSession();
    const pending = getHttp2(session, "/api-kube/api/v1/pending");

    await pendingReceived;
    fail(targetSessions[0]);

    expect((await pending).statusCode).toBe(500);
    expect(await getHttp2(session, "/api-kube/api/v1/pods")).toEqual({ statusCode: 200, body: "some-body" });
    expect(session.closed || session.destroyed).toBe(false);
  });

  it("ends a watch when the target drops its connection, and not the session of the client", async () => {
    const session = await connectSession();
    const watch = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });
    const watchClosed = untilClosed(watch);

    watch.resume();
    await once(watch, "response");
    targetSessions[0].destroy();
    await watchClosed;

    expect(session.closed || session.destroyed).toBe(false);
    expect(await getHttp2(session, "/api-kube/api/v1/pods")).toEqual({ statusCode: 200, body: "some-body" });
  });

  it("ends the response when the target aborts its own", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/aborted");

    expect(response).toEqual({ statusCode: 200, body: "some-partial-body" });
  });

  it("sends the headers of a watch over HTTP/1.1 before its first event", async () => {
    const response = new Promise<http.IncomingMessage>((resolve, reject) => {
      https
        .get(
          {
            host: "127.0.0.1",
            port,
            path: "/api-kube/api/v1/pods?watch=true",
            rejectUnauthorized: false,
            headers: { authorization: `Bearer ${proxyToken}` },
          },
          resolve,
        )
        .on("error", reject);
    });

    const { statusCode, headers, socket } = await response;

    socket.destroy();
    expect(statusCode).toBe(200);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("sends the headers of a watch over HTTP/2 before its first event", async () => {
    const session = await connectSession();
    const stream = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });
    const [headers] = (await once(stream, "response")) as [http2.IncomingHttpHeaders];

    expect(headers[":status"]).toBe(200);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("ends the request to the target when the client cancels its HTTP/2 stream, and not its connection", async () => {
    const session = await connectSession();
    const stream = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });

    stream.on("error", () => {});

    const req = await watchReceived;
    const targetStreamClosed = untilClosed(req.stream);

    // As Chromium does when a view stops watching
    stream.close(http2.constants.NGHTTP2_CANCEL);
    await targetStreamClosed;

    expect(session.closed || session.destroyed).toBe(false);
    expect(targetSessions).toHaveLength(1);
    expect(targetSessions[0].closed || targetSessions[0].destroyed).toBe(false);
  });

  it("ends the request to the target when the client closes its HTTP/1.1 connection", async () => {
    const response = new Promise<http.IncomingMessage>((resolve, reject) => {
      https
        .get(
          {
            host: "127.0.0.1",
            port,
            path: "/api-kube/api/v1/pods?watch=true",
            rejectUnauthorized: false,
            headers: { authorization: `Bearer ${proxyToken}` },
          },
          resolve,
        )
        .on("error", reject);
    });

    const { socket } = await response;
    const req = await watchReceived;
    const targetStreamClosed = untilClosed(req.stream);

    socket.destroy();
    await targetStreamClosed;
  });

  it("keeps the errors of cancelled requests out of the log", async () => {
    const session = await connectSession();
    const stream = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });

    stream.on("error", () => {});

    const req = await watchReceived;
    const targetStreamClosed = untilClosed(req.stream);

    stream.close(http2.constants.NGHTTP2_CANCEL);
    await targetStreamClosed;
    await afterTheAbort();

    expect(logError).not.toHaveBeenCalled();
  });

  it("ends an HTTP/2 request once it has been idle for the timeout of its target, and not the session", async () => {
    timeout = 100;

    const session = await connectSession();
    const stream = session.request({
      ":path": "/api-kube/api/v1/pods?watch=true",
      authorization: `Bearer ${proxyToken}`,
    });

    stream.on("error", () => {});

    const req = await watchReceived;
    const targetStreamClosed = untilClosed(req.stream);

    await once(stream, "close");

    expect(stream.rstCode).toBe(http2.constants.NGHTTP2_CANCEL);
    expect(session.closed || session.destroyed).toBe(false);

    // and the request to the target with it
    await targetStreamClosed;
    await afterTheAbort();
    expect(logError).not.toHaveBeenCalled();
  });
});

describe("Freelens proxy redirects of the kube api", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let target: http.Server;
  let targetReceived: string[];
  let agent: Agent;
  const sessions: http2.ClientHttp2Session[] = [];
  const apiPrefix = "/some-api-prefix";
  const cluster = { id: "some-cluster-id", disconnected: { get: () => false } } as unknown as Cluster;
  const rendererHost = () => `some-cluster-id.renderer.freelens.app:${port}`;

  const headersOfHttp1 = (path: string, headers: http.OutgoingHttpHeaders) =>
    new Promise<{ statusCode?: number; location?: string }>((resolve, reject) => {
      https
        .get(
          { host: "127.0.0.1", port, path, agent: false, rejectUnauthorized: false, headers: withAuth(headers) },
          (res) => {
            res.resume();
            resolve({ statusCode: res.statusCode, location: res.headers.location });
          },
        )
        .on("error", reject);
    });

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    targetReceived = [];
    // freelens-k8s-proxy, with an API server that answers /api with a
    // redirect to /api/, as one serving only the subtree does
    target = http.createServer((req, res) => {
      targetReceived.push(req.url ?? "");

      if (req.url === `${apiPrefix}/api`) {
        res.writeHead(301, { location: "/api/" }).end();
      } else if (req.url === `${apiPrefix}/api/`) {
        res.writeHead(200, { "content-type": "application/json" }).end('{"kind":"APIVersions"}');
      } else if (req.url === `${apiPrefix}/elsewhere`) {
        res.writeHead(302, { location: "https://some-login-page/sign-in" }).end();
      } else {
        res.writeHead(404).end();
      }
    });
    target.listen(0, "127.0.0.1");
    await once(target, "listening");

    const { port: targetPort } = target.address() as net.AddressInfo;

    // A target that speaks only HTTP/1.1, as freelens-k8s-proxy before it
    // offered HTTP/2 did
    agent = new Agent();

    overrideEnvironment(di);
    di.override(getClusterByIdInjectable, () => (id) => (id === cluster.id ? cluster : undefined));
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(
      freelensK8sProxyManagerInjectable,
      () =>
        ({
          getApiTarget: async () =>
            apiTargetOptions({
              target: new URL(`http://127.0.0.1:${targetPort}${apiPrefix}`),
              dispatcher: dispatcherFor(agent),
            }),
          apiUrl: new URL("https://some-api-server:6443"),
        }) as unknown as FreelensK8sProxyManager,
    );

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    for (const session of sessions) {
      session.destroy();
    }

    sessions.length = 0;
    await proxy.close();
    await agent.destroy();
    target.closeAllConnections();
    target.close();
  });

  it("keeps a redirect on the route of the cluster for a renderer over HTTP/1.1", async () => {
    const response = await headersOfHttp1("/api-kube/api", { host: rendererHost() });

    expect(response).toEqual({ statusCode: 301, location: "/api-kube/api/" });
  });

  it("keeps a redirect on the route of the cluster for a renderer over HTTP/2", async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    const stream = session.request({
      ":path": "/api-kube/api",
      ":authority": rendererHost(),
      authorization: `Bearer ${proxyToken}`,
    });
    const [headers] = (await once(stream, "response")) as [http2.IncomingHttpHeaders];

    stream.resume();
    expect(headers[":status"]).toBe(301);
    expect(headers.location).toBe("/api-kube/api/");
  });

  it("keeps a redirect on the route of the cluster for the main process, which follows it to the cluster", async () => {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });

    try {
      const response = await undiciFetch(`https://127.0.0.1:${port}/some-cluster-id/api`, {
        dispatcher,
        headers: { authorization: `Bearer ${proxyToken}` },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ kind: "APIVersions" });
      expect(targetReceived).toEqual([`${apiPrefix}/api`, `${apiPrefix}/api/`]);
    } finally {
      await dispatcher.close();
    }
  });

  it("passes a redirect to another host on as it is", async () => {
    const response = await headersOfHttp1("/api-kube/elsewhere", { host: rendererHost() });

    expect(response).toEqual({ statusCode: 302, location: "https://some-login-page/sign-in" });
  });
});

describe("Freelens proxy kube api requests to a refused target", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let getApiTarget: Mock;
  let route: Mock;
  let agent: Agent;

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    // A port that was free a moment ago and has nothing listening on it now
    const closed = http.createServer();

    closed.listen(0, "127.0.0.1");
    await once(closed, "listening");

    const { port: refusedPort } = closed.address() as net.AddressInfo;

    closed.close();
    await once(closed, "close");

    agent = new Agent();
    getApiTarget = vi.fn(async () =>
      apiTargetOptions({
        target: new URL(`http://127.0.0.1:${refusedPort}/some-api-prefix`),
        dispatcher: dispatcherFor(agent),
      }),
    );
    route = vi.fn(async (_cluster: Cluster | undefined, _req: ServerIncomingMessage, res: ServerResponse) => {
      res.end();
    });

    overrideEnvironment(di);
    di.override(
      getClusterForRequestInjectable,
      () => () => ({ id: "some-cluster-id", disconnected: { get: () => false } }) as unknown as Cluster,
    );
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(freelensK8sProxyManagerInjectable, () => ({ getApiTarget }) as unknown as FreelensK8sProxyManager);
    di.override(routerInjectable, () => ({ route }) as unknown as Router);

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    await proxy.close();
    await agent.destroy();
  });

  it("answers a GET with 500 at once, and does not send it again", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/pods");

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain("ECONNREFUSED");

    // Long enough for a retry scheduled on the error to have started
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(getApiTarget).toHaveBeenCalledTimes(1);
    expect(route).not.toHaveBeenCalled();
  });

  it("answers an HTTP/2 GET with 500 at once", async () => {
    const session = await connectHttp2(port);

    try {
      const response = await getHttp2(session, "/api-kube/api/v1/pods");

      expect(response.statusCode).toBe(500);
      expect(response.body).toContain("ECONNREFUSED");
    } finally {
      session.destroy();
    }
  });
});

describe("Freelens proxy kube api requests whose cluster proxy cannot start", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let route: Mock;
  let logError: Mock;

  const reason =
    'freelens-k8s-proxy exited with code 255 before it was ready: failed to initialize proxy handlerparse "::not-a-url/": missing protocol scheme';
  const expectedStatus = {
    kind: "Status",
    apiVersion: "v1",
    metadata: {},
    status: "Failure",
    message: `Failed to start the proxy of cluster some-cluster-id: ${reason}`,
    reason: "ServiceUnavailable",
    code: 503,
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    route = vi.fn();
    logError = vi.fn();

    overrideEnvironment(di);
    di.override(
      getClusterForRequestInjectable,
      () => () => ({ id: "some-cluster-id", disconnected: { get: () => false } }) as unknown as Cluster,
    );
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(
      freelensK8sProxyManagerInjectable,
      () =>
        ({
          getApiTarget: async () => {
            throw new Error(reason);
          },
        }) as unknown as FreelensK8sProxyManager,
    );
    di.override(routerInjectable, () => ({ route }) as unknown as Router);
    di.override(loggerInjectionToken, () => ({
      warn: vi.fn(),
      debug: vi.fn(),
      error: logError,
      info: vi.fn(),
      silly: vi.fn(),
    }));

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    await proxy.close();
  });

  it("answers an HTTP/1.1 request with 503 and the reason as a Kubernetes Status, and logs it", async () => {
    const response = await getHttp1(port, "/api-kube/version");

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual(expectedStatus);
    expect(route).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(`[FREELENS-PROXY]: ${expectedStatus.message}`, { url: "/version" });
  });

  it("answers an HTTP/2 request with 503 and the reason as a Kubernetes Status", async () => {
    const session = await connectHttp2(port);

    try {
      const response = await getHttp2(session, "/api-kube/api/v1/pods?watch=true");

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual(expectedStatus);
    } finally {
      session.destroy();
    }
  });
});

describe("Freelens proxy upgrade requests", () => {
  let di: DiContainer;
  let cluster: Cluster | undefined;
  let shellApiRequest: Mock;
  let kubeApiUpgradeRequest: Mock;
  let socket: { destroy: Mock; end: Mock; destroyed: boolean; writable: boolean; bytesWritten: number };

  const upgrade = (
    url: string,
    headers: http.IncomingHttpHeaders = { host: "127.0.0.1", authorization: `Bearer ${proxyToken}` },
  ) => {
    const proxy = di.inject(freelensProxyInjectable);
    // The upgrade handler is what is under test, and it runs long before the
    // server is listening.
    const server = (proxy as unknown as { proxyServer: NodeJS.EventEmitter }).proxyServer;

    server.emit("upgrade", { url, method: "GET", headers } as ServerIncomingMessage, socket, Buffer.from([]));
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    overrideEnvironment(di);

    proxyToken = di.inject(freelensProxyTokenInjectable).value;
    cluster = { id: "some-cluster-id", disconnected: { get: () => false } } as unknown as Cluster;
    shellApiRequest = vi.fn();
    kubeApiUpgradeRequest = vi.fn();
    socket = { destroy: vi.fn(), end: vi.fn(), destroyed: false, writable: true, bytesWritten: 0 };

    di.override(getClusterForRequestInjectable, () => () => cluster);
    di.override(shellApiRequestInjectable, () => shellApiRequest);
    di.override(kubeApiUpgradeRequestInjectable, () => kubeApiUpgradeRequest);
  });

  describe("when there is a cluster for the request", () => {
    it("routes an internal request to the shell api", () => {
      upgrade("/api?id=some-tab-id");

      expect(shellApiRequest).toHaveBeenCalledTimes(1);
      expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it("routes anything else to the kube api, with the cluster", () => {
      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      expect(kubeApiUpgradeRequest).toHaveBeenCalledWith(expect.objectContaining({ cluster }));
      expect(shellApiRequest).not.toHaveBeenCalled();
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it("answers 503 with the reason and closes the socket when the cluster proxy cannot start", async () => {
      kubeApiUpgradeRequest.mockRejectedValue(new Error("freelens-k8s-proxy exited with code 255 before it was ready"));

      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      await vi.waitFor(() => expect(socket.end).toHaveBeenCalledTimes(1));

      const [response] = socket.end.mock.calls[0] as [string];

      expect(response).toMatch(/^HTTP\/1\.1 503 Service Unavailable\r\n/);
      expect(response).toMatch(/\r\n\r\nfreelens-k8s-proxy exited with code 255 before it was ready\n$/);
    });

    it("destroys the socket of a failed upgrade that has already written to it", async () => {
      socket.bytesWritten = 10;
      kubeApiUpgradeRequest.mockRejectedValue(new Error("some-error"));

      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      await vi.waitFor(() => expect(socket.destroy).toHaveBeenCalledTimes(1));
      expect(socket.end).not.toHaveBeenCalled();
    });
  });

  describe("when there is no cluster for the request", () => {
    beforeEach(() => {
      cluster = undefined;
    });

    it("still routes an internal request to the shell api, without a cluster", () => {
      upgrade("/api?id=some-tab-id&type=standalone");

      expect(shellApiRequest).toHaveBeenCalledWith(expect.objectContaining({ cluster: undefined }));
      expect(socket.destroy).not.toHaveBeenCalled();
    });

    it("destroys any other upgrade request", () => {
      upgrade("/api-kube/api/v1/namespaces/default/pods/some-pod/exec");

      expect(socket.destroy).toHaveBeenCalledTimes(1);
      expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();
      expect(shellApiRequest).not.toHaveBeenCalled();
    });
  });

  describe("without a valid token", () => {
    it.each([
      ["an internal upgrade", "/api?id=some-tab-id"],
      ["a kube api upgrade", "/api-kube/api/v1/namespaces/default/pods/some-pod/exec"],
    ])("answers 403 and closes the socket, for %s", (_name, url) => {
      upgrade(url, { host: "127.0.0.1", authorization: "Bearer not-the-token" });

      const [response] = socket.end.mock.calls[0] as [string];

      expect(response).toMatch(/^HTTP\/1\.1 403 Forbidden\r\n/);
      expect(shellApiRequest).not.toHaveBeenCalled();
      expect(kubeApiUpgradeRequest).not.toHaveBeenCalled();
    });
  });
});

describe("Freelens proxy development static files", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let devServer: http.Server;
  let pendingRequestReceived: Promise<http.IncomingMessage>;
  const sessions: http2.ClientHttp2Session[] = [];

  const connectSession = async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    return session;
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    let receivePendingRequest: (req: http.IncomingMessage) => void;

    pendingRequestReceived = new Promise((resolve) => {
      receivePendingRequest = resolve;
    });

    // Stands in for the Vite dev server, which takes a while to transform a
    // module
    devServer = http.createServer((req, res) => {
      if (req.url === "/reset.js") {
        req.socket.destroy();

        return;
      }

      if (req.url === "/pending.js") {
        receivePendingRequest(req);

        return;
      }

      if (req.url === "/cut-off.js") {
        res.writeHead(200, { "content-length": 1000 }).write("some-partial-module");
        setTimeout(() => req.socket.destroy(), 10);

        return;
      }

      setTimeout(() => res.end(`some-module-at-${req.url}`), 20);
    });
    devServer.listen(0, "127.0.0.1");
    await once(devServer, "listening");

    vi.stubEnv("FREELENS_DEV_SERVER_PORT", String((devServer.address() as net.AddressInfo).port));

    overrideEnvironment(di);
    di.override(nodeEnvInjectionToken, () => "development");
    di.override(getClusterForRequestInjectable, () => () => undefined);
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());

    proxy = di.inject(freelensProxyInjectable);
    proxyToken = di.inject(freelensProxyTokenInjectable).value;

    await proxy.listen();
    port = di.inject(freelensProxyPortInjectable).get();
  });

  afterEach(async () => {
    for (const session of sessions) {
      session.destroy();
    }

    sessions.length = 0;
    vi.unstubAllEnvs();
    await proxy.close();
    devServer.closeAllConnections();
    devServer.close();
  });

  it("proxies the module requests of a page, all sent at once over HTTP/2", async () => {
    const session = await connectSession();
    const paths = Array.from({ length: 100 }, (_, index) => `/@fs/some-module-${index}.ts`);
    const responses = await Promise.all(paths.map((path) => getHttp2(session, path)));

    expect(responses).toEqual(paths.map((path) => ({ statusCode: 200, body: `some-module-at-${path}` })));
  });

  it("answers 502 over HTTP/2 when the dev server resets the connection", async () => {
    const session = await connectSession();

    expect(await getHttp2(session, "/reset.js")).toEqual({ statusCode: 502, body: expect.any(String) });
  });

  it("answers 502 over HTTP/1.1 when the dev server resets the connection", async () => {
    expect(await getHttp1(port, "/reset.js")).toEqual({ statusCode: 502, body: expect.any(String) });
  });

  it("resets the HTTP/2 stream when the dev server cuts off its response", async () => {
    const session = await connectSession();
    const stream = session.request({ ":path": "/cut-off.js" });
    let statusCode: number | undefined;

    stream.on("response", (headers) => (statusCode = headers[":status"]));
    stream.resume();
    await untilClosed(stream);

    expect(statusCode).toBe(200);
    expect(stream.rstCode).toBe(http2.constants.NGHTTP2_INTERNAL_ERROR);
    expect(session.closed || session.destroyed).toBe(false);
  });

  it("lets go of the dev server request when the client cancels its HTTP/2 stream", async () => {
    const session = await connectSession();
    const stream = session.request({ ":path": "/pending.js" });

    stream.on("error", () => {});

    const req = await pendingRequestReceived;
    const devServerRequestClosed = untilClosed(req.socket);

    // Over HTTP/1.1 the client closes its socket; over HTTP/2 only the stream
    // ends, and the proxy must not take that for an error of the dev server
    stream.close(http2.constants.NGHTTP2_CANCEL);
    await devServerRequestClosed;

    expect(session.closed || session.destroyed).toBe(false);
  });
});
