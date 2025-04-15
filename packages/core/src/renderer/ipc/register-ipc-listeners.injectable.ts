/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import { clusterListNamespaceForbiddenChannel } from "../../common/ipc/cluster";
import { hotbarTooManyItemsChannel } from "../../common/ipc/hotbar";
import { defaultHotbarCells } from "../../features/hotbar/storage/common/types";
import ipcRendererInjectable from "../utils/channel/ipc-renderer.injectable";
import listNamespacesForbiddenHandlerInjectable from "./list-namespaces-forbidden-handler.injectable";

const registerIpcListenersInjectable = getInjectable({
  id: "register-ipc-listeners",

  instantiate: (di) => {
    const listNamespacesForbiddenHandler = di.inject(listNamespacesForbiddenHandlerInjectable);
    const ipcRenderer = di.inject(ipcRendererInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return () => {
      ipcRenderer.on(clusterListNamespaceForbiddenChannel, listNamespacesForbiddenHandler);
      ipcRenderer.on(hotbarTooManyItemsChannel, () => {
        showErrorNotification(`Cannot have more than ${defaultHotbarCells} items pinned to a hotbar`);
      });
    };
  },
});

export default registerIpcListenersInjectable;
