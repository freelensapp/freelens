import { getInjectable } from "@ogre-tools/injectable";
import { PodLogsMenu } from "../pod-logs-menu";
import type { KubeObjectMenuItemComponent }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { computed } from "mobx";

const PodLogsMenuInjectable = getInjectable({
  id: "pod-logs-menu-node-pod-menu",

  instantiate: () => ({
    kind: "Pod",
    apiVersions: ["v1"],
    Component: PodLogsMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 3,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default PodLogsMenuInjectable;
