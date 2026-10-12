/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createPageParamInjectable from "../../navigation/create-page-param.injectable";

/**
 * The operator applied to the text still being typed in the search box, and to
 * the next facet committed from it.
 *
 * It lives in the URL beside `search` rather than in component state because
 * both the box and `ItemListLayout` need it, and because a shared link carrying
 * `search` without its operator would mean something different to whoever
 * opens it.
 */
const searchOperatorUrlPageParamInjectable = getInjectable({
  id: "search-operator-url-page-param",
  instantiate: (di) => {
    const createPageParam = di.inject(createPageParamInjectable);

    return createPageParam({
      name: "searchOp",
      defaultValue: "",
    });
  },
});

export default searchOperatorUrlPageParamInjectable;
