/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Call from "@hapi/call";
import type http from "node:http";

import type { Cluster } from "../../common/cluster/cluster";
import type { ServerIncomingMessage, ServerRequest, ServerResponse } from "../freelens-proxy/freelens-proxy";
import type { CreateHandlerForRoute, RouteHandler } from "./create-handler-for-route.injectable";
import type { ParseRequest } from "./parse-request.injectable";
import type { LensApiRequest, Route } from "./route";

export interface RouterRequestOpts {
  req: ServerRequest;
  res: ServerResponse;
  cluster: Cluster | undefined;
  params: Partial<Record<string, string>>;
  url: URL;
}

interface Dependencies {
  parseRequest: ParseRequest;
  createHandlerForRoute: CreateHandlerForRoute;
  readonly routes: Route<unknown, string>[];
}

interface RouteEntry {
  handler: RouteHandler;
  withoutToken: boolean;
}

export class Router {
  private readonly router = new Call.Router<RouteEntry>();

  constructor(private readonly dependencies: Dependencies) {
    for (const route of this.dependencies.routes) {
      this.router.add(
        { method: route.method, path: route.path },
        { handler: this.dependencies.createHandlerForRoute(route), withoutToken: route.withoutToken === true },
      );
    }
  }

  /**
   * Whether the route that `route` runs for this request is served without
   * the proxy's token. It matches the same normalized path as `route`, so no
   * spelling of a guarded path, such as `/./api/…`, reaches its route
   * unguarded. A request that matches no route, or whose target does not
   * parse, needs the token.
   */
  public isServedWithoutToken(method: string, reqUrl: string): boolean {
    try {
      return this.match(method, reqUrl)?.route.withoutToken === true;
    } catch {
      return false;
    }
  }

  public async route(cluster: Cluster | undefined, req: ServerIncomingMessage, res: ServerResponse): Promise<boolean> {
    const match = this.match(req.method, req.url);

    if (!match) {
      return false;
    }

    const request = await this.getRequest({ req, res, cluster, url: match.url, params: match.params });

    await match.route.handler(request, res);

    return true;
  }

  private match(method: string, reqUrl: string) {
    const url = new URL(reqUrl, "http://localhost");
    const matchingRoute = this.router.route(method.toLowerCase(), url.pathname);

    if (matchingRoute instanceof Error) {
      return undefined;
    }

    return { url, route: matchingRoute.route, params: matchingRoute.params };
  }

  protected async getRequest(opts: RouterRequestOpts): Promise<LensApiRequest<string>> {
    const { req, res, url, cluster, params } = opts;
    // Subtext reads the headers and the body stream, which the `http2`
    // compatibility request has as well, but its types only name the `http` one
    const { payload } = await this.dependencies.parseRequest(req as http.IncomingMessage, null, {
      parse: true,
      output: "data",
    });

    return {
      cluster,
      path: url.pathname,
      raw: {
        req,
        res,
      },
      query: url.searchParams,
      payload,
      params,
    };
  }
}
