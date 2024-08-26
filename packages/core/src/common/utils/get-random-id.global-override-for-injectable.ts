/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import { getRandomIdInjectionToken } from "@freelensapp/random";

export default getGlobalOverride(getRandomIdInjectionToken, () => () => "some-irrelevant-random-id");
