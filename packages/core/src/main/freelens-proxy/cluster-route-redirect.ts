/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface ClusterRouteRedirect {
  /**
   * The `Location` of the redirect, as the API server sent it.
   */
  readonly location: string;

  /**
   * The path and query that the request was forwarded with, below the URL of
   * the API server.
   */
  readonly requestPath: string;

  /**
   * The URL of the API server, as the kubeconfig gives it.
   */
  readonly apiUrl: URL;

  /**
   * The route of the cluster on the Freelens proxy that the request came in
   * on: `/api-kube` for a renderer, `/<cluster id>` for the main process.
   */
  readonly routePrefix: string;
}

/**
 * A redirect of the API server points into the URL space of the API server,
 * but the client of the Freelens proxy resolves it against the proxy. There a
 * relative one, such as the `/api/` that a server sends for `/api` when it
 * only serves the subtree, leaves the route of the cluster and gets the page
 * of the application, while kubectl follows it to the API server.
 *
 * Returns the location on the route of the cluster for a redirect that stays
 * on the API server, below its path, and `undefined` for one that leaves it,
 * which is passed on as it is.
 */
export function toClusterRoute({ location, requestPath, apiUrl, routePrefix }: ClusterRouteRedirect) {
  // freelens-k8s-proxy forwards a request below the path of the API server,
  // which a redirect may name in full
  const serverPath = apiUrl.pathname.replace(/\/+$/, "");
  let target: URL;

  try {
    target = new URL(location, new URL(`${serverPath}${requestPath}`, apiUrl.origin));
  } catch {
    return undefined;
  }

  if (target.origin !== apiUrl.origin) {
    return undefined;
  }

  if (serverPath && target.pathname !== serverPath && !target.pathname.startsWith(`${serverPath}/`)) {
    return undefined;
  }

  return `${routePrefix}${target.pathname.slice(serverPath.length) || "/"}${target.search}${target.hash}`;
}
