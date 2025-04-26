/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import { route } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";

const getVersionRouteInjectable = getRouteInjectable({
  id: "get-version-route",

  instantiate: (di) =>
    route({
      method: "get",
      path: `/version`,
    })(() => ({
      response: {
        version: di.inject(buildVersionInitializable.stateToken),
      },
    })),
});

export default getVersionRouteInjectable;
