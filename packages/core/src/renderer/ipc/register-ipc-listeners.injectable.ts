/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { clusterListNamespaceForbiddenChannel } from "../../common/ipc/cluster";
import ipcRendererInjectable from "../utils/channel/ipc-renderer.injectable";
import listNamespacesForbiddenHandlerInjectable from "./list-namespaces-forbidden-handler.injectable";

const registerIpcListenersInjectable = getInjectable({
  id: "register-ipc-listeners",

  instantiate: (di) => {
    const listNamespacesForbiddenHandler = di.inject(listNamespacesForbiddenHandlerInjectable);
    const ipcRenderer = di.inject(ipcRendererInjectable);

    return () => {
      ipcRenderer.on(clusterListNamespaceForbiddenChannel, listNamespacesForbiddenHandler);
    };
  },
});

export default registerIpcListenersInjectable;
