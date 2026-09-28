/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

const windowLocationInjectable = getInjectable({
  id: "window-location",
  instantiate: () => {
    // `host` carries the port, which is all any consumer needs.
    const { host } = window.location;

    return { host };
  },
  causesSideEffects: true,
});

export default windowLocationInjectable;
