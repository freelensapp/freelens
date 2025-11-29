/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import bundledBinaryPathInjectable from "../../common/utils/bundled-binary-path.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

const helmBinaryPathInjectable = getInjectable({
  id: "helm-binary-path",
  instantiate: (di) => {
    const bundledPath = di.inject(bundledBinaryPathInjectable, "helm");
    const state = di.inject(userPreferencesStateInjectable);

    return state.helmBinariesPath || bundledPath;
  },
});

export default helmBinaryPathInjectable;
