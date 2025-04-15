/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import focusWindowInjectable from "./focus-window.injectable";

export default getGlobalOverride(focusWindowInjectable, () => () => {});
