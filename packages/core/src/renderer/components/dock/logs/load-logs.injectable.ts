/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Pod } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import logStoreInjectable from "./store.injectable";
import type { LogTabData } from "./tab-store";

export interface LoadLogs {
  (
    tabId: string,
    pod: IComputedValue<Pod | undefined>,
    logTabData: IComputedValue<LogTabData | undefined>,
  ): Promise<void>;
}

const loadLogsInjectable = getInjectable({
  id: "load-logs",

  instantiate: (di): LoadLogs => {
    const logStore = di.inject(logStoreInjectable);

    return (tabId, pod, logTabData) => logStore.load(tabId, pod, logTabData);
  },
});

export default loadLogsInjectable;
