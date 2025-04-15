import type { ClusterRoleBinding } from "@freelensapp/kube-object";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

export type ClusterRoleBindingDialogState =
  | {
      isOpen: false;
      clusterRoleBinding?: undefined;
    }
  | {
      isOpen: true;
      clusterRoleBinding: ClusterRoleBinding | undefined;
    };

const clusterRoleBindingDialogStateInjectable = getInjectable({
  id: "cluster-role-binding-dialog-state",
  instantiate: () =>
    observable.box<ClusterRoleBindingDialogState>({
      isOpen: false,
    }),
});

export default clusterRoleBindingDialogStateInjectable;
