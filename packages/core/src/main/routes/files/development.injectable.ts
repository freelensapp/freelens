/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { Agent } from "node:http";
import path from "node:path";
import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { createProxyServer } from "http-proxy-3";
import { abortWhenClientCloses, isClientGone } from "../../freelens-proxy/abort-when-client-closes";
import { respondText } from "../../utils/http-responses";
import type http from "node:http";

import type { ServerResponse } from "../../freelens-proxy/freelens-proxy";
import type { LensApiRequest, RouteResponse } from "../../router/route";

const devStaticFileRouteHandlerInjectable = getInjectable({
  id: "dev-static-file-route-handler",
  instantiate: (di) => {
    const logger = di.inject(prefixedLoggerInjectable, "DEV-FILE-ROUTE");

    // Must match the `server.port` of the Vite dev server started by
    // `electron-vite dev` (freelens/electron.vite.config.ts); both sides read
    // the same environment variable.
    const devServerPort = Number(process.env.FREELENS_DEV_SERVER_PORT) || 9191;

    assert(Number.isInteger(devServerPort), "FREELENS_DEV_SERVER_PORT environment variable must only be an integer");

    // The renderer loads hundreds of modules at once over HTTP/2, and without
    // an agent every one of them opens its own connection to the dev server.
    // Windows client editions keep about 200 connections waiting to be
    // accepted and refuse the rest, so the pool is bounded and reused.
    const proxy = createProxyServer({ agent: new Agent({ keepAlive: true, maxSockets: 32 }) });
    const proxyTarget = `http://127.0.0.1:${devServerPort}`;

    abortWhenClientCloses(proxy);

    // The agent closes a kept-alive socket shortly before the dev server's
    // keep-alive timeout, but only when its timer fires in time. While the main
    // process is busy, as when a frame loads its modules, it can hand out a
    // socket the dev server is closing, and the request fails with ECONNRESET
    // through no fault of its own. Such a request is sent once more, as the Node
    // documentation of `request.reusedSocket` advises; a module that does not
    // load stalls the whole frame.
    const sentOnReusedSocket = new WeakMap<http.IncomingMessage, boolean>();
    const retried = new WeakSet<http.IncomingMessage>();

    proxy.on("proxyReq", (proxyReq, req) => {
      sentOnReusedSocket.set(req, proxyReq.reusedSocket);
    });

    const isRetriable = (error: NodeJS.ErrnoException, req: http.IncomingMessage) =>
      error.code === "ECONNRESET" &&
      (req.method === "GET" || req.method === "HEAD") &&
      sentOnReusedSocket.get(req) === true &&
      !retried.has(req);

    proxy.on("proxyRes", (proxyRes, _req, res) => {
      // A response the dev server cuts off would otherwise stay open for good,
      // holding the `load` event of the page
      proxyRes.once("close", () => {
        if (!proxyRes.complete) {
          res.destroy(new Error("the dev server cut off the response"));
        }
      });
    });

    // Without a listener http-proxy-3 throws the error, and the request is
    // never answered
    proxy.on("error", (error, req, res) => {
      // The two kinds of response, but the types of http-proxy-3 name only one;
      // this route proxies no upgrades, so it is never a socket
      const response = res as ServerResponse;

      if (isClientGone(response)) {
        return;
      }

      // A request without a body, so the ended request can be sent again
      if (!response.headersSent && isRetriable(error, req)) {
        retried.add(req);
        logger.debug(`request for ${req.url} failed on a reused socket, retrying: ${error}`);
        proxy.web(req, response as http.ServerResponse, { target: proxyTarget });

        return;
      }

      logger.warn(`request for ${req.url} failed: ${error}`);

      if (response.headersSent) {
        response.destroy(error);
      } else {
        respondText(response, `Dev server request failed: ${error}`, 502);
      }
    });

    return async ({ raw: { req, res }, params }: LensApiRequest<"/{path*}">): Promise<RouteResponse<Buffer>> => {
      // Vite's own namespaces (/@vite/client, /@react-refresh, /@fs/, /@id/)
      // are extension-less module URLs and must reach the dev server
      // untouched. Any other extension-less path is an SPA route and maps to
      // the transformed index.html, which Vite serves at /index.html (the
      // webpack dev server served it at /build/index.html). Asset requests
      // keep their original URL so Vite's query markers (?v=, ?import, ?t=)
      // survive the proxy hop.
      const isSpaRoute =
        !params.path || params.path === "/" || (!params.path.startsWith("@") && !path.posix.extname(params.path));

      if (isSpaRoute) {
        req.url = "/index.html";
      }

      // http-proxy-3 proxies an HTTP/2 request as well, but its types only
      // name the `http` objects
      proxy.web(req as http.IncomingMessage, res as http.ServerResponse, { target: proxyTarget });

      return { proxy };
    };
  },
});

export default devStaticFileRouteHandlerInjectable;
