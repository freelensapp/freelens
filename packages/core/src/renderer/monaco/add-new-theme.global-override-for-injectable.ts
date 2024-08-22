/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelens/test-utils";
import addNewMonacoThemeInjectable from "./add-new-theme.injectable";

export default getGlobalOverride(addNewMonacoThemeInjectable, () => () => {});
