/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import kubeDetailsUrlParamInjectable from "./kube-details-url.injectable";
import kubeSelectedUrlParamInjectable from "./kube-selected-url.injectable";

export type GetDetailsUrl = (selfLink: string, resetSelected?: boolean, mergeGlobals?: boolean) => string;

const getDetailsUrlInjectable = getInjectable({
  id: "get-details-url",
  instantiate: (di): GetDetailsUrl => {
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const kubeDetailsUrlParam = di.inject(kubeDetailsUrlParamInjectable);
    const kubeSelectedUrlParam = di.inject(kubeSelectedUrlParamInjectable);

    return (selfLink, resetSelected = false, mergeGlobals = true) => {
      const params = new URLSearchParams(mergeGlobals ? observableHistory.searchParams : "");

      params.set(kubeDetailsUrlParam.name, selfLink);

      // `get()` is undefined while nothing is selected, which URLSearchParams
      // would write as the string "undefined"
      const selected = resetSelected ? undefined : kubeSelectedUrlParam.get();

      if (selected) {
        params.set(kubeSelectedUrlParam.name, selected);
      } else {
        params.delete(kubeSelectedUrlParam.name);
      }

      return `?${params}`;
    };
  },
});

export default getDetailsUrlInjectable;
