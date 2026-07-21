/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { historyInjectable } from "./history.injectable";
import { createObservableHistory, ObservableHistory } from "./observable-history";
import { searchParamsOptions } from "./search-params";

import type { HistoryAdapter } from "./observable-history";

export const observableHistoryInjectionToken = getInjectionToken<ObservableHistory<unknown>>({
  id: "observable-history-injection-token",
});

export const observableHistoryInjectable = getInjectable({
  id: "observable-history",

  instantiate: (di) => {
    const history = di.inject(historyInjectable);
    // `history` is already adapted to the history v4 surface (see
    // `toHistoryV4`), which is what the observable wrapper consumes at runtime.
    // Its types still target history v5, hence the cast to `HistoryAdapter`.
    const navigation = createObservableHistory<unknown>(history as unknown as HistoryAdapter, {
      searchParams: searchParamsOptions,
    });

    return navigation;
  },
  injectionToken: observableHistoryInjectionToken,
});
