/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import freelensProxyPortInjectable from "../freelens-proxy/freelens-proxy-port.injectable";

import type { Cluster } from "../../common/cluster/cluster";

const kubeAuthProxyUrlInjectable = getInjectable({
  id: "kube-auth-proxy-url",
  instantiate: (di, cluster) => {
    const freelensProxyPort = di.inject(freelensProxyPortInjectable);

    return `https://127.0.0.1:${freelensProxyPort.get()}/${cluster.id}`;
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default kubeAuthProxyUrlInjectable;
