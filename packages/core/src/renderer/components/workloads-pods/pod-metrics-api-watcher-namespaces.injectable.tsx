import { computed } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../renderer/cluster-frame-context/for-namespaced-resources.injectable";

export const podMetricsWatcherNamespacesInjectable = getInjectable({
  id: "pod-metrics-watcher-namespaces",
  instantiate: (di) => {
    const clusterFrameContext = di.inject(clusterFrameContextForNamespacedResourcesInjectable);
    return computed(() => {
      if (clusterFrameContext.hasSelectedAll && clusterFrameContext.isGlobalWatchEnabled()) {
        return undefined;
      }
      return [...clusterFrameContext.contextNamespaces];
    });
  },
});
