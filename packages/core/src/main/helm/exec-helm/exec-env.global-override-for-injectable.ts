/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import { computed } from "mobx";
import execHelmEnvInjectable from "./exec-env.injectable";

export default getGlobalOverride(execHelmEnvInjectable, () => computed(() => ({})));
