import { historyInjectionToken } from "@freelensapp/routing";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { Router } from "react-router";

import { reactApplicationHigherOrderComponentInjectionToken } from "@freelensapp/react-application";

const routingReactApplicationHocInjectable = getInjectable({
  id: "routing-react-application-hoc",

  instantiate: (di) => {
    const history = di.inject(historyInjectionToken);

    return ({ children }) => <Router history={history}>{children}</Router>;
  },

  injectionToken: reactApplicationHigherOrderComponentInjectionToken,
});

export default routingReactApplicationHocInjectable;
