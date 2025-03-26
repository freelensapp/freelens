/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import queryString from "query-string";
import { observableHistoryInjectionToken } from "@freelensapp/routing";

const queryParametersInjectable = getInjectable({
  id: "query-parameters",

  instantiate: (di) => {
    const observableHistory = di.inject(observableHistoryInjectionToken);

    return computed(() => queryString.parse(observableHistory.location.search));
  },
});

export default queryParametersInjectable;
