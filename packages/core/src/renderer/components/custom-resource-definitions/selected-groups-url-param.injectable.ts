/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../navigation/create-page-param.injectable";
import { PageParamInit } from "../../navigation/page-param";

const selectedCustomResourceDefinitionGroupsUrlParamInjectable = getInjectable({
  id: "crd-groups-url-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam({
      name: "groups",
      defaultValue: new Set<string>(),
      parse: (value: string[] | string) => {
        if (value === undefined || value === null) {
          return new Set<string>();
        }
        return new Set<string>([value].flat());
      },
      stringify: (value) => Array.from(value),
    } as PageParamInit);
  },
});

export default selectedCustomResourceDefinitionGroupsUrlParamInjectable;
