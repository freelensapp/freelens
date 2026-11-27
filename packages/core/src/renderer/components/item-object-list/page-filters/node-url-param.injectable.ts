/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../../navigation/create-page-param.injectable";

const nodeUrlPageParamInjectable = getInjectable({
  id: "node-url-page-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam({
      name: "node",
      defaultValue: "",
    });
  },
});

export default nodeUrlPageParamInjectable;
