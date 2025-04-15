import { getGlobalOverrideForFunction } from "@freelensapp/test-utils";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import closeWindowInjectable from "./close-window.injectable";

export default getGlobalOverrideForFunction(closeWindowInjectable);
