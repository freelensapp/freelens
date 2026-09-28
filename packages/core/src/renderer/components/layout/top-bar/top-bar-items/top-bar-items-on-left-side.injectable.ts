/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { sortBy } from "es-toolkit";
import { computed } from "mobx";
import { topBarItemOnLeftSideInjectionToken } from "./top-bar-item-injection-token";

const topBarItemsOnLeftSideInjectable = getInjectable({
  id: "top-bar-items-on-left-side",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);

    const items = computedInjectMany(topBarItemOnLeftSideInjectionToken);

    return computed(() =>
      sortBy(
        items.get().filter((item) => item.isShown.get()),
        [(item) => item.orderNumber],
      ),
    );
  },
});

export default topBarItemsOnLeftSideInjectable;
