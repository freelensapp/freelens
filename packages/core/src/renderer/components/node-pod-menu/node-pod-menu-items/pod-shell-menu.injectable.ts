import { getInjectable } from "@ogre-tools/injectable";
import { PodShellMenu } from "../pod-shell-menu";
import type { KubeObjectMenuItemComponent }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { kubeObjectMenuItemInjectionToken }  from "../../kube-object-menu/kube-object-menu-item-injection-token";
import { computed } from "mobx";

const PodShellMenuInjectable = getInjectable({
  id: "pod-shell-menu-node-pod-menu",

  instantiate: () => ({
    kind: "Pod",
    apiVersions: ["v1"],
    Component: PodShellMenu as KubeObjectMenuItemComponent,
    enabled: computed(() => true),
    orderNumber: 2,
  }),
  injectionToken: kubeObjectMenuItemInjectionToken,
});

export default PodShellMenuInjectable;
