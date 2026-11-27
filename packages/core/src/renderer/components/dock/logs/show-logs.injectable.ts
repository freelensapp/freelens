/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import logStoreInjectable from "./store.injectable";

import type { Pod } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { LogTabData } from "./tab-store";

const showLogsInjectable = getInjectable({
  id: "show-logs",

  instantiate: (di) => {
    const logStore = di.inject(logStoreInjectable);

    return (
      tabId: string,
      pods: IComputedValue<Pod[]>,
      logTabData: IComputedValue<LogTabData | undefined>,
    ): Promise<void> => logStore.show(tabId, pods, logTabData);
  },
});

export default showLogsInjectable;
