/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import logStoreInjectable from "./store.injectable";

import type { Pod } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { LogTabData } from "./tab-store";

export interface LoadLogs {
  (tabId: string, pods: IComputedValue<Pod[]>, logTabData: IComputedValue<LogTabData | undefined>): Promise<void>;
}

const loadLogsInjectable = getInjectable({
  id: "load-logs",

  instantiate: (di): LoadLogs => {
    const logStore = di.inject(logStoreInjectable);

    return (tabId, pods, logTabData) => logStore.load(tabId, pods, logTabData);
  },
});

export default loadLogsInjectable;
