import { noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { clusterRefreshAccessibilityChannel } from "../../../common/ipc/cluster";
import hostedClusterIdInjectable from "../../cluster-frame-context/hosted-cluster-id.injectable";
import customResourceDefinitionStoreInjectable from "../../components/custom-resource-definitions/store.injectable";
import ipcRendererInjectable from "../../utils/channel/ipc-renderer.injectable";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";

const refreshAccessibilityOnCrdChangesInjectable = getInjectable({
  id: "refresh-accessibility-on-crd-changes",
  instantiate: (di) => ({
    run: () => {
      const crdStore = di.inject(customResourceDefinitionStoreInjectable);
      const hostedClusterId = di.inject(hostedClusterIdInjectable);
      const ipcRenderer = di.inject(ipcRendererInjectable);

      let debounceTimer: NodeJS.Timeout | undefined;

      reaction(
        () =>
          crdStore
            .getItems()
            .map((crd) => crd.getId())
            .sort()
            .join(","),
        (currentIds, previousIds) => {
          // Skip initial run and only react to actual changes
          if (!hostedClusterId || previousIds === undefined) return;

          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            ipcRenderer.invoke(clusterRefreshAccessibilityChannel, hostedClusterId).catch(noop);
          }, 400);
        },
      );
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default refreshAccessibilityOnCrdChangesInjectable;
