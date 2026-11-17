/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import registerYamlFoldingRangeProviderInjectable from "../../monaco/register-yaml-folding-range-provider.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../tokens";

const registerMonacoYamlFoldingInjectable = getInjectable({
  id: "register-monaco-yaml-folding",
  instantiate: (di) => ({
    run: () => {
      di.inject(registerYamlFoldingRangeProviderInjectable)();
    },
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default registerMonacoYamlFoldingInjectable;
