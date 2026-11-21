/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import guardExtensionComponentsInjectable from "../../extension-loader/guard-extension-components.injectable";
import { kubeObjectMenuItemInjectionToken } from "./kube-object-menu-item-injection-token";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";

const kubeObjectMenuItemRegistratorInjectable = getInjectable({
  id: "kube-object-menu-item-registrator",

  instantiate: (di) => {
    const getRandomId = di.inject(getRandomIdInjectionToken);
    const guardExtensionComponents = di.inject(guardExtensionComponentsInjectable);

    const getExtensionShouldBeEnabledForClusterFrame = (extension: LensRendererExtension) =>
      di.inject(extensionShouldBeEnabledForClusterFrameInjectable, extension);

    return (ext) => {
      const extension = ext as LensRendererExtension;

      const extensionShouldBeEnabledForClusterFrame = getExtensionShouldBeEnabledForClusterFrame(extension);
      const guard = guardExtensionComponents(extension, "kubeObjectMenuItems");

      return extension.kubeObjectMenuItems.map((registration) => {
        const id = `kube-object-menu-item-registration-from-${extension.sanitizedExtensionId}-${getRandomId()}`;
        const MenuItem = guard.component(registration.components.MenuItem, {
          fallback: "nothing",
          resetKey: ({ object }) => object,
        });

        return getInjectable({
          id,

          instantiate: () => ({
            kind: registration.kind,
            apiVersions: registration.apiVersions,
            Component: MenuItem,

            enabled: computed(() => {
              if (!extensionShouldBeEnabledForClusterFrame.value.get()) {
                return false;
              }

              return registration.visible ? registration.visible.get() : true;
            }),

            orderNumber: 100,
          }),

          injectionToken: kubeObjectMenuItemInjectionToken,
        });
      });
    };
  },

  injectionToken: extensionRegistratorInjectionToken,
});

export default kubeObjectMenuItemRegistratorInjectable;
