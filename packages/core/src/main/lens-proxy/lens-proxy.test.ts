/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { once } from "node:events";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import tls from "node:tls";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import lensProxyCertificateInjectable from "../../common/certificate/lens-proxy-certificate.injectable";
import { nodeEnvInjectionToken } from "../../common/vars/node-env-injection-token";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import routerInjectable from "../router/router.injectable";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";
import lensProxyInjectable from "./lens-proxy.injectable";
import lensProxyPortInjectable from "./lens-proxy-port.injectable";
import kubeApiUpgradeRequestInjectable from "./proxy-functions/kube-api-upgrade-request.injectable";
import shellApiRequestInjectable from "./proxy-functions/shell-api-request.injectable";
import type net from "node:net";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { Cluster } from "../../common/cluster/cluster";
import type { KubeAuthProxyServer } from "../cluster/kube-auth-proxy-server.injectable";
import type { Router } from "../router/router";
import type { ServerIncomingMessage, ServerResponse } from "./lens-proxy";

/**
 * The proxy chooses between HTTP/2 and HTTP/1.1 through ALPN, which needs a
 * real TLS server, and the certificate of unit tests is a placeholder. This
 * one was made for these tests only, with `openssl req -x509 -newkey ec`: its
 * key protects nothing. It is generated ahead of time because generating keys
 * inside a Vitest worker can crash the worker at teardown.
 */
const testCertificate = {
  cert: `-----BEGIN CERTIFICATE-----
MIIB4jCCAYigAwIBAgIUNX6HxilPxIoumHygDgdlXj8GWDAwCgYIKoZIzj0EAwIw
JDEiMCAGA1UEAwwZRnJlZWxlbnMgdGVzdCBjZXJ0aWZpY2F0ZTAgFw0yNjEwMDMx
MjA1MzFaGA8yMTI2MDkwOTEyMDUzMVowJDEiMCAGA1UEAwwZRnJlZWxlbnMgdGVz
dCBjZXJ0aWZpY2F0ZTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABBuA47PQuI9Q
HWHiY897aJWFHMwvCi7ohSWaEwUqcoQ8AzL/q5ZOxQLST/7kPyZAY9Ja3ZL6mD+0
wGIh4hYteYGjgZUwgZIwHQYDVR0OBBYEFMBn+ApS+M2jGTTGV1p2RUp9utMmMB8G
A1UdIwQYMBaAFMBn+ApS+M2jGTTGV1p2RUp9utMmMA8GA1UdEwEB/wQFMAMBAf8w
PwYDVR0RBDgwNoIVcmVuZGVyZXIuZnJlZWxlbnMuYXBwghcqLnJlbmRlcmVyLmZy
ZWVsZW5zLmFwcIcEfwAAATAKBggqhkjOPQQDAgNIADBFAiEA7PpvR9DsxXAaFafD
0Vj0RNDa13ZvJaeZUtuCWZ/YYIgCIASDveKIahqYM+sn2wtcOLsnsrs+z8qg1S1y
IwI5cqTs
-----END CERTIFICATE-----`,
  private: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgMzK6YmXo+/pfi+/3
mqufu4FJqWVZWcxYepT9H7s7bBWhRANCAAQbgOOz0LiPUB1h4mPPe2iVhRzMLwou
6IUlmhMFKnKEPAMy/6uWTsUC0k/+5D8mQGPSWt2S+pg/tMBiIeIWLXmB
-----END PRIVATE KEY-----`,
  public: "",
};

const overrideEnvironment = (di: DiContainer) => {
  di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
  di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
  di.override(lensProxyCertificateInjectable, () => ({ get: () => testCertificate, set: () => {} }));
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

const getHttp1 = (port: number, path: string, headers: http.OutgoingHttpHeaders = {}) =>
  new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    https
      .get({ host: "127.0.0.1", port, path, agent: false, rejectUnauthorized: false, headers }, (res) => {
        let body = "";

        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body }));
      })
      .on("error", reject);
  });

const getHttp2 = (session: http2.ClientHttp2Session, path: string, headers: http2.OutgoingHttpHeaders = {}) =>
  new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const stream = session.request({ ":path": path, ...headers });
    let statusCode: number | undefined;
    let body = "";

    stream.setEncoding("utf8");
    stream.on("response", (responseHeaders) => (statusCode = responseHeaders[":status"]));
    stream.on("data", (chunk: string) => (body += chunk));
    stream.on("end", () => resolve({ statusCode, body }));
    stream.on("error", reject);
  });

describe("closing the lens proxy", () => {
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

    proxy = di.inject(lensProxyInjectable);

    await proxy.listen();
    port = di.inject(lensProxyPortInjectable).get();
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
      "GET /api?id=some-tab-id HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n",
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

describe("lens proxy protocols", () => {
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
            if (req.url === "/some-open-response") {
              res.writeHead(200).write("some-start");

              return;
            }

            res.end(`some-response-over-${req.httpVersion}`);
          },
        }) as unknown as Router,
    );

    proxy = di.inject(lensProxyInjectable);

    await proxy.listen();
    port = di.inject(lensProxyPortInjectable).get();
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
});

describe("lens proxy kube api requests", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let target: http.Server;
  let targetReceived: { url?: string; host?: string; authorization?: string }[];
  let watchReceived: Promise<http.IncomingMessage>;
  let timeout: number | undefined;
  const sessions: http2.ClientHttp2Session[] = [];

  const apiPrefix = "/some-api-prefix";

  const connectSession = async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    return session;
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    let receiveWatch: (req: http.IncomingMessage) => void;

    targetReceived = [];
    watchReceived = new Promise((resolve) => {
      receiveWatch = resolve;
    });
    timeout = undefined;
    target = http.createServer((req, res) => {
      targetReceived.push({ url: req.url, host: req.headers.host, authorization: req.headers.authorization });

      if (req.url?.endsWith("/aborted")) {
        res.writeHead(200).write("some-partial-body");
        setTimeout(() => req.socket.destroy(), 10);

        return;
      }

      // A watch with no event yet: the target sends its headers at once, as
      // freelens-k8s-proxy does, and then nothing
      if (req.url?.includes("watch=true")) {
        res.writeHead(200, { "content-type": "application/json" }).flushHeaders();
        receiveWatch(req);

        return;
      }

      res.end("some-body");
    });
    target.listen(0, "127.0.0.1");
    await once(target, "listening");

    const { port: targetPort } = target.address() as net.AddressInfo;

    overrideEnvironment(di);
    di.override(getClusterForRequestInjectable, () => () => ({ id: "some-cluster-id" }) as Cluster);
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(
      kubeAuthProxyServerInjectable,
      () =>
        ({
          getApiTarget: async () => ({
            target: new URL(`http://127.0.0.1:${targetPort}${apiPrefix}`),
            changeOrigin: true,
            timeout,
            headers: { Host: "some-cluster-host" },
          }),
        }) as unknown as KubeAuthProxyServer,
    );

    proxy = di.inject(lensProxyInjectable);

    await proxy.listen();
    port = di.inject(lensProxyPortInjectable).get();
  });

  afterEach(async () => {
    for (const session of sessions) {
      session.destroy();
    }

    sessions.length = 0;
    await proxy.close();
    target.closeAllConnections();
    target.close();
  });

  it("forwards the request below the path of the target, with the host of the cluster", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/pods", { authorization: "some-token" });

    expect(response).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetReceived).toEqual([
      { url: `${apiPrefix}/api/v1/pods`, host: "some-cluster-host", authorization: undefined },
    ]);
  });

  it("forwards an HTTP/2 request below the path of the target, with the host of the cluster", async () => {
    const session = await connectSession();
    const response = await getHttp2(session, "/api-kube/api/v1/pods", { authorization: "some-token" });

    expect(response).toEqual({ statusCode: 200, body: "some-body" });
    expect(targetReceived).toEqual([
      { url: `${apiPrefix}/api/v1/pods`, host: "some-cluster-host", authorization: undefined },
    ]);
  });

  it("ends the response when the target aborts its own", async () => {
    const response = await getHttp1(port, "/api-kube/api/v1/aborted");

    expect(response).toEqual({ statusCode: 200, body: "some-partial-body" });
  });

  it("sends the headers of a watch over HTTP/1.1 before its first event", async () => {
    const response = new Promise<http.IncomingMessage>((resolve, reject) => {
      https
        .get({ host: "127.0.0.1", port, path: "/api-kube/api/v1/pods?watch=true", rejectUnauthorized: false }, resolve)
        .on("error", reject);
    });

    const { statusCode, headers, socket } = await response;

    socket.destroy();
    expect(statusCode).toBe(200);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("sends the headers of a watch over HTTP/2 before its first event", async () => {
    const session = await connectSession();
    const stream = session.request({ ":path": "/api-kube/api/v1/pods?watch=true" });
    const [headers] = (await once(stream, "response")) as [http2.IncomingHttpHeaders];

    expect(headers[":status"]).toBe(200);
    expect(headers["content-type"]).toBe("application/json");
  });

  it("ends the request to the target when the client cancels its HTTP/2 stream", async () => {
    const session = await connectSession();
    const stream = session.request({ ":path": "/api-kube/api/v1/pods?watch=true" });

    stream.on("error", () => {});

    const req = await watchReceived;
    const targetRequestClosed = untilClosed(req.socket);

    // As Chromium does when a view stops watching
    stream.close(http2.constants.NGHTTP2_CANCEL);
    await targetRequestClosed;

    expect(session.closed || session.destroyed).toBe(false);
  });

  it("ends an HTTP/2 request once it has been idle for the timeout of its target, and not the session", async () => {
    timeout = 100;

    const session = await connectSession();
    const stream = session.request({ ":path": "/api-kube/api/v1/pods?watch=true" });

    stream.on("error", () => {});
    await once(stream, "close");

    expect(stream.rstCode).toBe(http2.constants.NGHTTP2_CANCEL);
    expect(session.closed || session.destroyed).toBe(false);
  });
});

describe("lens proxy kube api requests to a refused target", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let getApiTarget: Mock;
  let route: Mock;

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    // A port that was free a moment ago and has nothing listening on it now
    const closed = http.createServer();

    closed.listen(0, "127.0.0.1");
    await once(closed, "listening");

    const { port: refusedPort } = closed.address() as net.AddressInfo;

    closed.close();
    await once(closed, "close");

    getApiTarget = vi.fn(async () => ({ target: new URL(`http://127.0.0.1:${refusedPort}/some-api-prefix`) }));
    route = vi.fn(async (_cluster: Cluster | undefined, _req: ServerIncomingMessage, res: ServerResponse) => {
      res.end();
    });

    overrideEnvironment(di);
    di.override(getClusterForRequestInjectable, () => () => ({ id: "some-cluster-id" }) as Cluster);
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());
    di.override(kubeAuthProxyServerInjectable, () => ({ getApiTarget }) as unknown as KubeAuthProxyServer);
    di.override(routerInjectable, () => ({ route }) as unknown as Router);

    proxy = di.inject(lensProxyInjectable);

    await proxy.listen();
    port = di.inject(lensProxyPortInjectable).get();
  });

  afterEach(async () => {
    await proxy.close();
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

describe("lens proxy upgrade requests", () => {
  let di: DiContainer;
  let cluster: Cluster | undefined;
  let shellApiRequest: Mock;
  let kubeApiUpgradeRequest: Mock;
  let socket: { destroy: Mock };

  const upgrade = (url: string) => {
    const proxy = di.inject(lensProxyInjectable);
    // The upgrade handler is what is under test, and it runs long before the
    // server is listening.
    const server = (proxy as unknown as { proxyServer: NodeJS.EventEmitter }).proxyServer;

    server.emit("upgrade", { url, method: "GET", headers: {} } as ServerIncomingMessage, socket, Buffer.from([]));
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    overrideEnvironment(di);

    cluster = { id: "some-cluster-id" } as Cluster;
    shellApiRequest = vi.fn();
    kubeApiUpgradeRequest = vi.fn();
    socket = { destroy: vi.fn() };

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
});

describe("lens proxy development static files", () => {
  let proxy: { listen: () => Promise<void>; close: () => Promise<void> | undefined };
  let port: number;
  let devServer: http.Server;
  let openConnections: number;
  let mostOpenConnections: number;
  let pendingRequestReceived: Promise<http.IncomingMessage>;
  const sessions: http2.ClientHttp2Session[] = [];

  const connectSession = async () => {
    const session = await connectHttp2(port);

    sessions.push(session);

    return session;
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    openConnections = 0;
    mostOpenConnections = 0;

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
    devServer.on("connection", (socket: net.Socket) => {
      mostOpenConnections = Math.max(mostOpenConnections, ++openConnections);
      socket.once("close", () => openConnections--);
    });
    devServer.listen(0, "127.0.0.1");
    await once(devServer, "listening");

    vi.stubEnv("FREELENS_DEV_SERVER_PORT", String((devServer.address() as net.AddressInfo).port));

    overrideEnvironment(di);
    di.override(nodeEnvInjectionToken, () => "development");
    di.override(getClusterForRequestInjectable, () => () => undefined);
    di.override(shellApiRequestInjectable, () => vi.fn());
    di.override(kubeApiUpgradeRequestInjectable, () => vi.fn());

    proxy = di.inject(lensProxyInjectable);

    await proxy.listen();
    port = di.inject(lensProxyPortInjectable).get();
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

  it("proxies the module requests of a page, all sent at once over HTTP/2, over a bounded number of connections", async () => {
    const session = await connectSession();
    const paths = Array.from({ length: 100 }, (_, index) => `/@fs/some-module-${index}.ts`);
    const responses = await Promise.all(paths.map((path) => getHttp2(session, path)));

    expect(responses).toEqual(paths.map((path) => ({ statusCode: 200, body: `some-module-at-${path}` })));
    // One connection per request would overflow the listen queue of the dev
    // server, which is 128 on macOS
    expect(mostOpenConnections).toBeLessThanOrEqual(16);
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
