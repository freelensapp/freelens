/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { historyInjectionToken, toHistoryV4 } from "@freelensapp/routing";
import { getGlobalOverride } from "@freelensapp/test-utils";
import { createMemoryHistory } from "history";

export default getGlobalOverride(historyInjectionToken, () => toHistoryV4(createMemoryHistory()));
