/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import windowLocationInjectable from "./window-location.injectable";

export default getGlobalOverride(windowLocationInjectable, () => ({
  host: "localhost",
  port: "12345",
}));
