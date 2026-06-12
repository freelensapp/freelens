/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import kubeObjectHandlersInjectable from "../../kube-object/handlers.injectable";

import type { KubeObject } from "@freelensapp/kube-object";

import type { KubeObjectOnContextMenuOpenContext } from "../../kube-object/handler";

export type OnKubeObjectContextMenuOpen = (obj: KubeObject, ctx: KubeObjectOnContextMenuOpenContext) => void;

const onKubeObjectContextMenuOpenInjectable = getInjectable({
  id: "on-kube-object-context-menu-open",
  instantiate: (di): OnKubeObjectContextMenuOpen => {
    const handlers = di.inject(kubeObjectHandlersInjectable);

    return (obj, ctx) => {
      const specificHandlers = handlers.get().get(obj.apiVersion)?.get(obj.kind) ?? [];

      for (const { onContextMenuOpen } of specificHandlers) {
        onContextMenuOpen?.(ctx);
      }
    };
  },
});

export default onKubeObjectContextMenuOpenInjectable;
