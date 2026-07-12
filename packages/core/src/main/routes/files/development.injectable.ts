/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import httpProxy from "http-proxy-node16";
import path from "path";

import type { LensApiRequest, RouteResponse } from "../../router/route";

// Must match the `server.port` of the Vite dev server started by
// `electron-vite dev` (freelens/electron.vite.config.ts); both sides read the
// same environment variable.
const devServerPort = Number(process.env.FREELENS_DEV_SERVER_PORT) || 9191;

assert(Number.isInteger(devServerPort), "FREELENS_DEV_SERVER_PORT environment variable must only be an integer");

const devStaticFileRouteHandlerInjectable = getInjectable({
  id: "dev-static-file-route-handler",
  instantiate: () => {
    const proxy = httpProxy.createProxy();
    const proxyTarget = `http://127.0.0.1:${devServerPort}`;

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

      proxy.web(req, res, { target: proxyTarget });

      return { proxy };
    };
  },
});

export default devStaticFileRouteHandlerInjectable;
