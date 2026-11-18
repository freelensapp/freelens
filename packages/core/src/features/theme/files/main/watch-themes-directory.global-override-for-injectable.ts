/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import watchThemesDirectoryInjectable from "./watch-themes-directory.injectable";

export default getGlobalOverride(watchThemesDirectoryInjectable, () => () => {});
