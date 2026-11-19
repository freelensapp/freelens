/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { apiKubePrefix } from "../../../common/vars";
import { route } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";

// A kube api request goes to its cluster without reaching the router. One
// that does reach it has no cluster, and would otherwise get the renderer's
// files.
const apiKubeNotFoundRouteInjectable = getRouteInjectable({
  id: "api-kube-not-found-route",
  instantiate: () =>
    route({
      method: "get",
      path: `${apiKubePrefix}/{path*}`,
    })(() => ({ statusCode: 404 })),
});

export default apiKubeNotFoundRouteInjectable;
