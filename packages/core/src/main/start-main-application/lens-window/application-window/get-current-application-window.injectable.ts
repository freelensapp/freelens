/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { applicationWindowInjectionToken } from "./application-window-injection-token";

const getCurrentApplicationWindowInjectable = getInjectable({
  id: "get-current-application-window",

  instantiate: (di) => () => di.injectMany(applicationWindowInjectionToken).at(0),
});

export default getCurrentApplicationWindowInjectable;
