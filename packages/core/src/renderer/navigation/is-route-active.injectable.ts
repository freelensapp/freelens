/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import matchRouteInjectable from "./match-route.injectable";

import type { MatchPathOptions } from "@freelensapp/routing";

export type IsRouteActive = (route: string | string[] | MatchPathOptions) => boolean;

const isActiveRouteInjectable = getInjectable({
  id: "is-active-route",
  instantiate: (di): IsRouteActive => {
    const matchRoute = di.inject(matchRouteInjectable);

    return (route) => Boolean(matchRoute(route));
  },
});

export default isActiveRouteInjectable;
