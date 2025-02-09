import { getInjectable } from "@ogre-tools/injectable";
import type { KubeObjectMenuItemComponent }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { PodAttachMenu } from "../pod-attach-menu";
import { computed } from "mobx";

const podAttachMenuInjectable = getInjectable({
  id: "pod-attach-menu-node-pod-menu",

  instantiate: () => ({
    kind: "Pod",
    apiVersions: ["v1"],
    Component: PodAttachMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 1,
  }),

  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default podAttachMenuInjectable;
