/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import isDevelopmentInjectable from "../../../common/vars/is-development.injectable";
import { route } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";
import devStaticFileRouteHandlerInjectable from "./development.injectable";
import prodStaticFileRouteHandlerInjectable from "./production.injectable";

const staticFileRouteInjectable = getRouteInjectable({
  id: "static-file-route",

  instantiate: (di) => {
    const isDevelopment = di.inject(isDevelopmentInjectable);

    return route({
      method: "get",
      path: `/{path*}`,
    })(
      isDevelopment ? di.inject(devStaticFileRouteHandlerInjectable) : di.inject(prodStaticFileRouteHandlerInjectable),
    );
  },
});

export default staticFileRouteInjectable;
