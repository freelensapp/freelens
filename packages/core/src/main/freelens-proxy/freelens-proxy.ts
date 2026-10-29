/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import http2 from "node:http2";
import net from "node:net";
import { apiKubePrefix, apiPrefix } from "../../common/vars";
import { respondJson, respondText } from "../utils/http-responses";
import { getBoolean } from "../utils/parse-query";
import { abortFetchWhenClientCloses, isClientGone } from "./abort-when-client-closes";
import { hasAllowedHost, hasAllowedOrigin } from "./allowed-request";
import { toClusterRoute } from "./cluster-route-redirect";
import { stripToken, tokenFromHeaders } from "./freelens-proxy-token";
import type http from "node:http";

import type { Logger } from "@freelensapp/logger";

import type { ProxyServer, ServerOptions } from "http-proxy-3";
import type { SetRequired } from "type-fest";

import type { EmitAppEvent } from "../../common/app-event-bus/emit-event.injectable";
import type { SelfSignedCert } from "../../common/certificate/certificate";
import type { Cluster } from "../../common/cluster/cluster";
import type { FreelensK8sProxyManager } from "../cluster/freelens-k8s-proxy-manager.injectable";
import type { Router } from "../router/router";
import type { ClusterRouteRedirect } from "./cluster-route-redirect";
import type { FreelensProxyToken } from "./freelens-proxy-token.injectable";
import type { ProxyApiRequestArgs, ShellApiRequestArgs } from "./proxy-functions";

/**
 * The server answers HTTP/2 and falls back to HTTP/1.1, so a request and its
 * response are either the `http2` compatibility objects or the `http` ones.
 */
export type ServerRequest = http.IncomingMessage | http2.Http2ServerRequest;
export type ServerResponse = http.ServerResponse | http2.Http2ServerResponse;
export type GetClusterForRequest = (req: ServerRequest) => Cluster | undefined;
export type ServerIncomingMessage = SetRequired<ServerRequest, "url" | "method">;
export type FreelensProxyApiRequest = (args: ProxyApiRequestArgs) => void | Promise<void>;
export type FreelensProxyShellApiRequest = (args: ShellApiRequestArgs) => void | Promise<void>;

interface Dependencies {
  getClusterForRequest: GetClusterForRequest;
  shellApiRequest: FreelensProxyShellApiRequest;
  kubeApiUpgradeRequest: FreelensProxyApiRequest;
  emitAppEvent: EmitAppEvent;
  getFreelensK8sProxyManager: (cluster: Cluster) => FreelensK8sProxyManager;
  readonly router: Router;
  readonly proxy: ProxyServer;
  readonly freelensProxyPort: { set: (portNumber: number) => void };
  readonly contentSecurityPolicy: string;
  readonly logger: Logger;
  readonly certificate: SelfSignedCert;
  readonly token: FreelensProxyToken;
}

/**
 * An upgrade is always an HTTP/1.1 request: HTTP/2 has no upgrade.
 */
type UpgradeRequest = ProxyApiRequestArgs["req"];

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * An error of `fetch` says only `fetch failed`, and keeps what failed, such as
 * `connect ECONNREFUSED`, in its `cause`.
 */
const describeError = (error: Error) =>
  error.cause === undefined ? String(error) : `${error} (${messageOf(error.cause)})`;

const watchParam = "watch";
const followParam = "follow";

export function isLongRunningRequest(reqUrl: string) {
  const url = new URL(reqUrl, "http://localhost");

  return getBoolean(url.searchParams, watchParam) || getBoolean(url.searchParams, followParam);
}

/**
 * Whether a request reaches a cluster or the main process's own API and so has
 * to carry the token: the kube api (`/api-kube`), the local router api
 * (`/api`, which serves helm, the service-account kubeconfig, port-forward,
 * metrics and the resource applier), and the internal upgrade (`/api?…`).
 * `apiKubePrefix` begins with `apiPrefix`, so the one test covers both. Serving
 * the renderer and `/version` need no token, so the window loads without one.
 */
export function requiresToken(reqUrl: string) {
  return reqUrl.startsWith(apiPrefix);
}

/**
 * API responses are not meant to be reused, so the client is told not to
 * store them. The Kubernetes API server answers with `no-cache, private`,
 * which is weaker, so the proxy replaces it.
 */
const noStore = "no-store";

/**
 * This is the list of ports that chrome considers unsafe to allow HTTP
 * connections to. Because they are the standard ports for processes that are
 * too forgiving in the connection types they accept.
 *
 * If we get one of these ports, the easiest thing to do is to just try again.
 *
 * Source: https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/net/base/port_util.cc
 */
const disallowedPorts = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110,
  111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532,
  540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000,
  6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

/**
 * How long a connection that is still serving a request is given to finish
 * before it is destroyed, once the proxy has stopped accepting new ones.
 */
const closeGracePeriodMs = 500;

/**
 * Every watch and follow request of a renderer is a stream that stays open, so
 * a session carries many more of them than the default settings assume. The
 * stream limit is far above what a renderer opens, and the memory limit, in
 * megabytes, keeps a session with many streams from being ended with
 * `NGHTTP2_ENHANCE_YOUR_CALM`, which the default of 10 does.
 */
const maxConcurrentStreams = 1000;
const maxSessionMemory = 100;

/**
 * nghttp2 guards against the rapid reset attack (CVE-2023-44487) by ending a
 * session with `GOAWAY(INTERNAL_ERROR)` once a client resets more streams than
 * a burst refilled at a steady rate; its defaults are a burst of 1000 at 33 per
 * second. Chromium resets streams in numbers of its own: on a reload it cancels
 * each module it has in its cache once the headers have arrived, and switching
 * views cancels the watches and lists of the previous one. The burst and rate
 * are set well above what a reload reaches — a reload measures in the tens to a
 * few hundred, and the test covers a burst past a thousand — while still an
 * order of magnitude below a flood, so the guard holds.
 */
const streamResetBurst = 10_000;
const streamResetRate = 1_000;

export class FreelensProxy {
  protected readonly proxyServer: http2.Http2SecureServer;
  protected closed = false;

  /**
   * The open HTTP/2 sessions, and the sockets of every connection, which
   * includes the HTTP/1.1 ones and those upgraded to a shell session. They are
   * what `close` has to end: the HTTP/2 server has no `closeAllConnections`.
   */
  protected readonly sessions = new Set<http2.ServerHttp2Session>();
  protected readonly sockets = new Set<net.Socket>();

  /**
   * What a redirect of the API server needs to be kept on the route of its
   * cluster, for every kube api request on its way to the cluster.
   */
  protected readonly clusterRoutes = new WeakMap<object, Omit<ClusterRouteRedirect, "location">>();

  constructor(private readonly dependencies: Dependencies) {
    this.configureProxy(dependencies.proxy);

    /**
     * Chromium allows six HTTP/1.1 connections per host, and every open watch
     * holds one of them, so over HTTP/1.1 a few list views leave further
     * requests queued. Over HTTP/2 all requests of a frame share one
     * connection. Chromium negotiates it through ALPN on its own, and
     * HTTP/1.1 stays available for the clients that need it, and for upgrades.
     */
    this.proxyServer = http2.createSecureServer(
      {
        key: dependencies.certificate.private,
        cert: dependencies.certificate.cert,
        allowHTTP1: true,
        maxSessionMemory,
        settings: { maxConcurrentStreams },
        streamResetBurst,
        streamResetRate,
      },
      // With `allowHTTP1` the listener receives the `http` objects for an
      // HTTP/1.1 request, which the types of `createSecureServer` do not say
      (req: ServerRequest, res: ServerResponse) => {
        this.handleRequest(req as ServerIncomingMessage, res);
      },
    );

    this.proxyServer.on("session", (session) => {
      this.sessions.add(session);
      session.once("close", () => this.sessions.delete(session));
    });

    this.proxyServer.on("connection", (socket: net.Socket) => {
      this.sockets.add(socket);
      socket.once("close", () => this.sockets.delete(socket));
    });

    this.proxyServer.on("upgrade", (req: UpgradeRequest, socket: net.Socket, head: Buffer) => {
      // An upgrade reaches a shell or the kube api, so it carries the token
      // like any other request, behind the same host and origin layers.
      // Refused before the cluster is looked up.
      if (!hasAllowedHost(req.headers) || !hasAllowedOrigin(req.headers)) {
        this.dependencies.logger.warn(`[FREELENS-PROXY]: rejected an upgrade from a foreign host or origin`, {
          url: req.url,
        });
        this.rejectUpgradeForbidden(socket);

        return;
      }

      if (!this.dependencies.token.matches(tokenFromHeaders(req.headers))) {
        this.dependencies.logger.warn(`[FREELENS-PROXY]: rejected an upgrade without a valid token`, { url: req.url });
        this.rejectUpgradeForbidden(socket);

        return;
      }

      /**
       * Decided before the cluster is looked up: an internal upgrade is a
       * shell request, and a shell can be opened outside of any cluster
       * session. Everything else is a kube-api upgrade and still requires one.
       */
      const isInternal = req.url.startsWith(`${apiPrefix}?`);
      const cluster = this.dependencies.getClusterForRequest(req);

      (async () => {
        if (isInternal) {
          return this.dependencies.shellApiRequest({ req, socket, head, cluster });
        }

        if (!cluster) {
          this.dependencies.logger.error(
            `[FREELENS-PROXY]: Could not find cluster for upgrade request from url=${req.url}`,
          );
          socket.destroy();

          return;
        }

        return this.dependencies.kubeApiUpgradeRequest({ req, socket, head, cluster });
      })().catch((error) => {
        this.dependencies.logger.error("[FREELENS-PROXY]: failed to handle proxy upgrade", error);
        this.rejectUpgrade(socket, error);
      });
    });
  }

  /**
   * Starts to listen on an OS provided port. Will reject if the server throws
   * an error.
   *
   * Resolves with the port number that was picked
   */
  private attemptToListen(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.proxyServer.listen(0, "127.0.0.1");

      this.proxyServer
        .once("listening", () => {
          this.proxyServer.removeAllListeners("error"); // don't reject the promise

          const { address, port } = this.proxyServer.address() as net.AddressInfo;

          this.dependencies.freelensProxyPort.set(port);

          this.dependencies.logger.info(`[FREELENS-PROXY]: Proxy server has started at ${address}:${port}`);

          this.proxyServer.on("error", (error) => {
            this.dependencies.logger.info(`[FREELENS-PROXY]: Subsequent error: ${error}`);
          });

          // Extensions can subscribe to this event through `appEventBus`, so its name stays.
          this.dependencies.emitAppEvent({ name: "lens-proxy", action: "listen", params: { port } });
          resolve(port);
        })
        .once("error", (error) => {
          this.dependencies.logger.info(`[FREELENS-PROXY]: Proxy server failed to start: ${error}`);
          reject(error);
        });
    });
  }

  /**
   * Starts the Freelens proxy.
   * @resolves After the server is listening on a good port
   * @rejects if there is an error before that happens
   */
  async listen(): Promise<void> {
    const seenPorts = new Set<number>();

    while (true) {
      this.proxyServer?.close();
      const port = await this.attemptToListen();

      if (!disallowedPorts.has(port)) {
        // We didn't get a port that would result in an ERR_UNSAFE_PORT error, use it
        return;
      }

      this.dependencies.logger.warn(
        `[FREELENS-PROXY]: Proxy server has with port known to be considered unsafe to connect to by chrome, restarting...`,
      );

      if (seenPorts.has(port)) {
        /**
         * Assume that if we have seen the port before, then the OS has looped
         * through all the ports possible and we will not be able to get a safe
         * port.
         */
        throw new Error("Failed to start Freelens Proxy due to seeing too many unsafe ports. Please restart Freelens.");
      } else {
        seenPorts.add(port);
      }
    }
  }

  close() {
    if (this.closed) {
      return;
    }

    // mark as closed immediately
    this.closed = true;
    this.dependencies.logger.info("[FREELENS-PROXY]: Closing server");

    return new Promise<void>((resolve) => {
      /**
       * The proxy carries connections that are never idle -- watch and follow
       * requests, and the sockets of upgraded shell sessions -- so waiting for
       * them to end on their own would hang the quit sequence. Give them the
       * grace period and then destroy whatever is left, which lets `close`
       * finally call back.
       */
      const destroyRemaining = setTimeout(() => {
        for (const socket of this.sockets) {
          socket.destroy();
        }
      }, closeGracePeriodMs);

      /**
       * Closing the server also closes the idle HTTP/1.1 connections. A
       * session is closed here as well, which refuses new streams and ends it
       * once its open ones have ended: at once when it has none.
       */
      this.proxyServer.close(() => {
        clearTimeout(destroyRemaining);
        resolve();
      });

      for (const session of this.sessions) {
        session.close();
      }
    });
  }

  protected configureProxy(proxy: ProxyServer): ProxyServer {
    /**
     * The kube api requests take the fetch path of http-proxy-3, where
     * `proxyRes` is no stream, only an object with the status and the headers
     * of the response, emitted before the proxy writes them. A target that
     * cuts off its response reaches the `error` handler.
     */
    proxy.on("proxyRes", (proxyRes, req, res) => {
      this.keepRedirectOnClusterRoute(proxyRes, req);
      proxyRes.headers["cache-control"] = noStore;

      /**
       * The response headers are only sent with the first byte of the body,
       * and a watch has none until its first event, so the renderer would not
       * see the request answered until then. The proxy sets the status and the
       * headers right after this event, so send them once it has.
       */
      setImmediate(() => {
        if (!res.headersSent && !res.writableEnded) {
          res.flushHeaders();
        }
      });
    });

    proxy.on("error", (error, req, res, target) => {
      // A client that went away is no error of the target: over HTTP/1.1
      // http-proxy-3 tells it apart by the closed socket of the request, but
      // over HTTP/2 that socket is the session's, which stays open
      if (this.closed || res instanceof net.Socket || isClientGone(res)) {
        return;
      }

      // The target cut off a response whose headers have gone out already,
      // as freelens-k8s-proxy does to its watches when it exits. The client
      // sees its response end, and restarts a watch.
      if (res.headersSent) {
        this.dependencies.logger.debug(`[FREELENS-PROXY]: target ended the response early: ${describeError(error)}`, {
          url: req.url,
        });
        res.end();

        return;
      }

      this.dependencies.logger.error(`[FREELENS-PROXY]: http proxy errored for cluster: ${describeError(error)}`, {
        url: req.url,
      });

      if (target) {
        this.dependencies.logger.debug(`Failed proxy to target: ${JSON.stringify(target, null, 2)}`);
      }

      // Not retried here: whoever sent the request decides whether to send it
      // again (a watch that fails is restarted by its store), so a retry would
      // only delay the error it handles anyway.
      try {
        res.writeHead(500).end(`Oops, something went wrong.\n${describeError(error)}`);
      } catch (e) {
        this.dependencies.logger.error(`[FREELENS-PROXY]: Failed to write headers: `, e);
      }
    });

    return proxy;
  }

  /**
   * http-proxy-3 writes the headers of the response right after `proxyRes`,
   * so a `Location` changed here is the one the client gets.
   */
  protected keepRedirectOnClusterRoute(proxyRes: http.IncomingMessage, req: object) {
    const route = this.clusterRoutes.get(req);
    const { statusCode = 0 } = proxyRes;
    const { location } = proxyRes.headers;

    if (!route || !location || statusCode < 300 || statusCode >= 400) {
      return;
    }

    const clusterLocation = toClusterRoute({ ...route, location });

    if (clusterLocation) {
      proxyRes.headers.location = clusterLocation;
    }
  }

  protected async handleRequest(req: ServerIncomingMessage, res: ServerResponse) {
    // The route of the cluster as the client asked for it: the lookup points a
    // request of the main process at the kube api, and rewrites the path a
    // kubectl or helm client uses (`/<clusterId>/…`) to `/api-kube/…`.
    const requestedUrl = req.url;
    const cluster = this.dependencies.getClusterForRequest(req);

    // Requires the token on the kube api and the local router api, on the URL
    // as the lookup has rewritten it, so the `/<clusterId>/…` path of kubectl
    // and helm is covered. The renderer and `/version` are served without a
    // token. The host and origin are checked first, behind the token.
    if (requiresToken(req.url)) {
      // An API response, whatever answers it. The renderer's own files may
      // still be cached.
      res.setHeader("Cache-Control", noStore);

      if (!hasAllowedHost(req.headers) || !hasAllowedOrigin(req.headers)) {
        this.dependencies.logger.warn(`[FREELENS-PROXY]: rejected a request from a foreign host or origin`, {
          url: req.url,
        });

        return this.respondWithError(res, 403, "Forbidden");
      }

      if (!this.dependencies.token.matches(tokenFromHeaders(req.headers))) {
        this.dependencies.logger.warn(`[FREELENS-PROXY]: rejected a request without a valid token`, { url: req.url });

        return this.respondWithError(res, 403, "Forbidden");
      }
    }

    if (cluster && req.url.startsWith(apiKubePrefix)) {
      stripToken(req.headers);
      // The `Origin` a frame's browser adds is checked above and means nothing
      // to the cluster, which is not the origin of the page. A cluster behind a
      // gateway such as the GitLab agent server refuses an origin it does not
      // know, so it is not forwarded.
      delete req.headers.origin;
      req.url = req.url.replace(apiKubePrefix, "");

      // A cluster the user has not connected gets no proxy process started for
      // it: a request for one fails instead.
      if (cluster.disconnected.get()) {
        return this.respondWithError(res, 503, {
          kind: "Status",
          apiVersion: "v1",
          metadata: {},
          status: "Failure",
          message: `Cluster ${cluster.id} is not connected`,
          reason: "ServiceUnavailable",
          code: 503,
        });
      }

      const freelensK8sProxyManager = this.dependencies.getFreelensK8sProxyManager(cluster);
      let proxyTarget: ServerOptions | undefined;

      try {
        proxyTarget = await freelensK8sProxyManager.getApiTarget(isLongRunningRequest(req.url));
      } catch (error) {
        const message = `Failed to start the proxy of cluster ${cluster.id}: ${messageOf(error)}`;

        this.dependencies.logger.error(`[FREELENS-PROXY]: ${message}`, { url: req.url });

        // A Kubernetes Status, which is what a client of the Kubernetes API
        // reads the reason of a failed request from
        return this.respondWithError(res, 503, {
          kind: "Status",
          apiVersion: "v1",
          metadata: {},
          status: "Failure",
          message,
          reason: "ServiceUnavailable",
          code: 503,
        });
      }

      if (proxyTarget) {
        const { apiUrl } = freelensK8sProxyManager;

        if (apiUrl) {
          this.clusterRoutes.set(req, {
            requestPath: req.url,
            apiUrl,
            routePrefix: requestedUrl.startsWith(apiKubePrefix) ? apiKubePrefix : `/${cluster.id}`,
          });
        }

        return this.proxyWeb(req, res, proxyTarget);
      }
    }

    res.setHeader("Content-Security-Policy", this.dependencies.contentSecurityPolicy);

    try {
      await this.dependencies.router.route(cluster, req, res);
    } catch (error) {
      this.dependencies.logger.error("[FREELENS-PROXY]: failed to route request", { url: req.url, error });
      this.respondWithError(res, 500, `Oops, something went wrong.\n${error}`);
    }
  }

  /**
   * Answers an upgrade that failed before anything was written for it, such
   * as one whose cluster proxy could not be started, and closes its socket
   * either way: nothing else would.
   */
  protected rejectUpgrade(socket: net.Socket, error: unknown) {
    if (socket.destroyed) {
      return;
    }

    if (!socket.writable || socket.bytesWritten > 0) {
      socket.destroy();

      return;
    }

    const body = `${messageOf(error)}\n`;

    socket.end(
      [
        "HTTP/1.1 503 Service Unavailable",
        "Content-Type: text/plain; charset=utf-8",
        `Content-Length: ${Buffer.byteLength(body)}`,
        "Connection: close",
        "",
        body,
      ].join("\r\n"),
    );
  }

  /**
   * Refuses an upgrade that carries no valid token, before anything of it is
   * read, and closes its socket.
   */
  protected rejectUpgradeForbidden(socket: net.Socket) {
    if (socket.destroyed) {
      return;
    }

    const body = "Forbidden\n";

    socket.end(
      [
        "HTTP/1.1 403 Forbidden",
        "Content-Type: text/plain; charset=utf-8",
        `Content-Length: ${Buffer.byteLength(body)}`,
        "Connection: close",
        "",
        body,
      ].join("\r\n"),
    );
  }

  /**
   * Answers a request that failed before anything was written for it, and
   * ends one that has already started its response.
   */
  protected respondWithError(res: ServerResponse, status: number, body: object | string) {
    if (isClientGone(res) || res.writableEnded) {
      return;
    }

    try {
      if (res.headersSent) {
        res.end();
      } else if (typeof body === "string") {
        respondText(res, body, status);
      } else {
        respondJson(res, body, status);
      }
    } catch (error) {
      this.dependencies.logger.error(`[FREELENS-PROXY]: Failed to write headers: `, error);
    }
  }

  protected proxyWeb(req: ServerIncomingMessage, res: ServerResponse, target: ServerOptions) {
    if (req instanceof http2.Http2ServerRequest && target.timeout) {
      /**
       * http-proxy-3 applies `timeout` to `req.socket`, which for an HTTP/2
       * request stands for the session, where it does nothing. Apply it to the
       * stream instead, and end the stream once it has been idle that long,
       * as the socket of an HTTP/1.1 request is.
       */
      const { timeout, ...options } = target;
      const { stream } = req;

      stream.setTimeout(timeout, () => stream.close(http2.constants.NGHTTP2_CANCEL));
      target = options;
    }

    // Setting `fetchOptions` also keeps the request on the fetch path, the only
    // one whose abort is wired up here
    const onBeforeRequest = target.fetchOptions?.onBeforeRequest;

    target = {
      ...target,
      fetchOptions: {
        ...target.fetchOptions,
        onBeforeRequest: async (requestOptions, req, res, options) => {
          abortFetchWhenClientCloses(requestOptions, res);
          await onBeforeRequest?.(requestOptions, req, res, options);
        },
      },
    };

    // http-proxy-3 proxies an HTTP/2 request as well, but its types only name
    // the `http` objects
    this.dependencies.proxy.web(req as http.IncomingMessage, res as http.ServerResponse, target);
  }
}
