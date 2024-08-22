/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelens/test-utils";
import requestSystemCAsInjectable from "./request-system-cas.injectable";

export default getGlobalOverride(requestSystemCAsInjectable, () => async () => []);
