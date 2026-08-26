/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../navigation/create-page-param.injectable";

/**
 * Holds the named-field facets, kept separate from `search`.
 *
 * Splitting them means every URL, bookmark and `searchUrlParam.set(...)` caller
 * that predates facets - the catalog's label badges, for one - keeps behaving
 * exactly as before: a bare `search` is still the "all fields" query.
 */
const facetsUrlPageParamInjectable = getInjectable({
  id: "facets-url-page-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam({
      name: "facets",
      defaultValue: "",
    });
  },
});

export default facetsUrlPageParamInjectable;
