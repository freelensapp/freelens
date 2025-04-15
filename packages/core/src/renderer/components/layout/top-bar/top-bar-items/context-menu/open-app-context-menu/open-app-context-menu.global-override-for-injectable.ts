/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverrideForFunction } from "@freelensapp/test-utils";
import openAppContextMenuInjectable from "./open-app-context-menu.injectable";

export default getGlobalOverrideForFunction(openAppContextMenuInjectable);
