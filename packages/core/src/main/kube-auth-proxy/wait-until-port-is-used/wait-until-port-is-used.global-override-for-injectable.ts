/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import waitUntilPortIsUsedInjectable from "./wait-until-port-is-used.injectable";

export default getGlobalOverride(waitUntilPortIsUsedInjectable, () => () => {
  throw new Error("Tried to wait until port is used without explicit override.");
});
