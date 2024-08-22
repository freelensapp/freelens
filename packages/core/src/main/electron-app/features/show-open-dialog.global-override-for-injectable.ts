/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverrideForFunction } from "@freelens/test-utils";
import showOpenDialogInjectable from "./show-open-dialog.injectable";

export default getGlobalOverrideForFunction(showOpenDialogInjectable);
