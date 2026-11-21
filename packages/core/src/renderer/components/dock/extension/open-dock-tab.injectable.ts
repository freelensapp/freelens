/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import { copyDockTabParams, writeExtensionDockTabData } from "./params";
import registeredDockTabsInjectable from "./registered-dock-tabs.injectable";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { OpenDockTabOptions } from "./dock-tab-registration";

export type OpenExtensionDockTab = (
  extension: LensRendererExtension,
  typeId: string,
  options?: OpenDockTabOptions,
) => string;

const openExtensionDockTabInjectable = getInjectable({
  id: "open-extension-dock-tab",

  instantiate: (di): OpenExtensionDockTab => {
    const clusterId = di.inject(hostedClusterIdInjectable);
    const registrations = di.inject(registeredDockTabsInjectable);

    return (extension, typeId, options = {}) => {
      if (!clusterId) {
        throw new Error("Extension dock tabs can only be opened from a cluster frame");
      }

      const registration = registrations.get().find((item) => item.owner === extension && item.id === typeId);

      if (!registration?.enabled.get()) {
        throw new Error(`Dock tab ${typeId} is not registered and enabled for ${extension.name} in this cluster`);
      }

      const { title = registration.title } = options;

      if (typeof title !== "string") {
        throw new Error("Dock tab title must be a string");
      }

      const { params: requestedParams = {} } = options;
      const params = copyDockTabParams(requestedParams);
      const dockStore = di.inject(dockStoreInjectable);

      return dockStore.createTab(
        {
          kind: TabKind.EXTENSION,
          title,
          extensionTab: writeExtensionDockTabData({
            version: 1,
            extensionName: registration.extensionName,
            typeId,
            params,
          }),
        },
        false,
      ).id;
    };
  },
});

export default openExtensionDockTabInjectable;
