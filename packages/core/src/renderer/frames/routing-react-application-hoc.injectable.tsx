/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { reactApplicationHigherOrderComponentInjectionToken } from "@freelensapp/react-application";
import { historyInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { Router } from "react-router";

const routingReactApplicationHocInjectable = getInjectable({
  id: "routing-react-application-hoc",

  instantiate: (di) => {
    const history = di.inject(historyInjectionToken);

    return ({ children }) => <Router history={history}>{children}</Router>;
  },

  injectionToken: reactApplicationHigherOrderComponentInjectionToken,
});

export default routingReactApplicationHocInjectable;
