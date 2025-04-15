/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { computed } from "mobx";
import type { KubeApiResourceDescriptor } from "../../common/rbac";
import { formatKubeApiResource } from "../../common/rbac";
import { shouldShowResourceInjectionToken } from "../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import hostedClusterInjectable from "./hosted-cluster.injectable";

const shouldShowResourceInjectable = getInjectable({
  id: "should-show-resource",
  instantiate: (di, resource) => {
    const cluster = di.inject(hostedClusterInjectable);

    return cluster
      ? computed(() => cluster.resourcesToShow.has(formatKubeApiResource(resource)))
      : computed(() => false);
  },
  injectionToken: shouldShowResourceInjectionToken,
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, resource: KubeApiResourceDescriptor) => formatKubeApiResource(resource),
  }),
});

export default shouldShowResourceInjectable;
