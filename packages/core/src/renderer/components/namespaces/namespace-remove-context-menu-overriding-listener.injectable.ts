/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import { staticKubeObjectHandlerInjectionToken } from "../../kube-object/handler";
import withConfirmationInjectable from "../confirm-dialog/with-confirm.injectable";
import requestDeleteNamespaceInjectable from "./request-delete-namespace.injectable";

import type { Namespace } from "@freelensapp/kube-object";

import type { KubeObjectOnContextMenuOpenContext } from "../../kube-object/handler";

const namespaceRemoveContextMenuOverridingListenerInjectable = getInjectable({
  id: "namespace-remove-context-menu-overriding-listener",
  instantiate: (di) => {
    const requestDeleteNamespace = di.inject(requestDeleteNamespaceInjectable);
    const withConfirmation = di.inject(withConfirmationInjectable);

    return {
      apiVersions: ["v1"],
      kind: "Namespace",
      onContextMenuOpen: action((ctx: KubeObjectOnContextMenuOpenContext) => {
        ctx.menuItems.replace([
          {
            id: "new-delete-kube-object",
            icon: "delete",
            title: "Delete",
            onClick: (obj) =>
              withConfirmation({
                message: `Are you sure you want to delete namespace ${obj.getName()}?`,
                labelOk: "Remove",
                ok: async () => requestDeleteNamespace(obj as Namespace),
              })(),
          },
          ...ctx.menuItems.filter((menuItem) => menuItem.id !== "delete-kube-object"),
        ]);
      }),
    };
  },
  injectionToken: staticKubeObjectHandlerInjectionToken,
});

export default namespaceRemoveContextMenuOverridingListenerInjectable;
