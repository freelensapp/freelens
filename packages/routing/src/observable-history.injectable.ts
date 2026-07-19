/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { createObservableHistory, ObservableHistory } from "mobx-observable-history";
import { historyInjectable } from "./history.injectable";
import { searchParamsOptions } from "./search-params";

export const observableHistoryInjectionToken = getInjectionToken<ObservableHistory<unknown>>({
  id: "observable-history-injection-token",
});

export const observableHistoryInjectable = getInjectable({
  id: "observable-history",

  instantiate: (di) => {
    const history = di.inject(historyInjectable);
    // `history` is already adapted to the history v4 surface (see
    // `toHistoryV4`), which is what `createObservableHistory` expects at
    // runtime. Its types still target history v4, hence the cast.
    const navigation = createObservableHistory<unknown>(history as never, {
      searchParams: searchParamsOptions,
    });

    return navigation;
  },
  injectionToken: observableHistoryInjectionToken,
});
