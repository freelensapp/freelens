/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverrideForFunction } from "@freelens/test-utils";
import lensFetchInjectable from "./lens-fetch.injectable";

export default getGlobalOverrideForFunction(lensFetchInjectable);
