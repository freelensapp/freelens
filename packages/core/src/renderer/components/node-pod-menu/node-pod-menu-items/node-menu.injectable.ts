import { getInjectable } from "@ogre-tools/injectable";
import { NodeMenu } from "../node-menu";
import type { KubeObjectMenuItemComponent }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { computed } from "mobx";

const NodeMenuInjectable = getInjectable({
  id: "node-menu-node-pod-menu",

  instantiate: () => ({
    kind: "Node",
    apiVersions: ["v1"],
    Component: NodeMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 1,
  }),
  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default NodeMenuInjectable;
