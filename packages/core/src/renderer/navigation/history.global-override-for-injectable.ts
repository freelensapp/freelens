/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createMemoryHistory } from "history";
import { getGlobalOverride } from "@freelensapp/test-utils";
import { historyInjectionToken } from "@freelensapp/routing";

export default getGlobalOverride(historyInjectionToken, () => createMemoryHistory());
