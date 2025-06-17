/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { matchPath } from "react-router";

import type { match, RouteProps } from "react-router";

export type MatchRoute = <Params extends { [K in keyof Params]?: string }>(
  route: string | string[] | RouteProps,
) => match<Params> | null;

const matchRouteInjectable = getInjectable({
  id: "match-route",
  instantiate: (di): MatchRoute => {
    const observableHistory = di.inject(observableHistoryInjectionToken);

    return (route) => matchPath(observableHistory.location.pathname, route);
  },
});

export default matchRouteInjectable;
