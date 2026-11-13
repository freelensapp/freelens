/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import registerYamlFoldingRangeProviderInjectable from "./register-yaml-folding-range-provider.injectable";

export default getGlobalOverride(registerYamlFoldingRangeProviderInjectable, () => () => {});
