/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { reactApplicationHigherOrderComponentInjectionToken } from "@freelensapp/react-application";
import { historyInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { Router } from "react-router";

const routingReactApplicationHocInjectable = getInjectable({
  id: "routing-react-application-hoc",

  instantiate: (di) => {
    const history = di.inject(historyInjectionToken);

    // The injected history is adapted to the history v4 runtime surface
    // (see `toHistoryV4`), which is what `react-router` v5 consumes. Its static
    // type is history v5, hence the cast to satisfy the v4-typed `Router` prop.
    return ({ children }) => <Router history={history as never}>{children}</Router>;
  },

  injectionToken: reactApplicationHigherOrderComponentInjectionToken,
});

export default routingReactApplicationHocInjectable;
