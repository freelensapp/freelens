/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";

const currentPathInjectable = getInjectable({
  id: "current-path",

  instantiate: (di) => {
    const observableHistory = di.inject(observableHistoryInjectionToken);

    return computed(() => observableHistory.location.pathname);
  },
});

export default currentPathInjectable;
