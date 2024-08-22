/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { parse as parseQueryString } from "query-string";
import { observableHistoryInjectionToken } from "@freelens/routing";

const queryParametersInjectable = getInjectable({
  id: "query-parameters",

  instantiate: (di) => {
    const observableHistory = di.inject(observableHistoryInjectionToken);

    return computed(() => parseQueryString(observableHistory.location.search));
  },
});

export default queryParametersInjectable;
