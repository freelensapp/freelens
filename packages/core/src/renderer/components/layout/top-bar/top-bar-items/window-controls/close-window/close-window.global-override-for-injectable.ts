/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import closeWindowInjectable from "./close-window.injectable";
import { getGlobalOverrideForFunction } from "@freelens/test-utils";

export default getGlobalOverrideForFunction(closeWindowInjectable);
