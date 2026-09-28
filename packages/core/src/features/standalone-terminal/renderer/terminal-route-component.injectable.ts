/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import terminalRouteInjectable from "../../../common/front-end-routing/routes/terminal/terminal-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import { TerminalPage } from "./terminal-page";

const terminalRouteComponentInjectable = getInjectable({
  id: "terminal-route-component",

  instantiate: (di) => ({
    route: di.inject(terminalRouteInjectable),
    Component: TerminalPage,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default terminalRouteComponentInjectable;
