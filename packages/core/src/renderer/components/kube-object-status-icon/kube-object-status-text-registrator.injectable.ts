/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { kubeObjectStatusTextInjectionToken } from "./kube-object-status-text-injection-token";

const kubeObjectStatusTextRegistratorInjectable = getInjectable({
  id: "kube-object-status-text-registrator",

  instantiate: (di) => {
    const getRandomId = di.inject(getRandomIdInjectionToken);

    const getExtensionShouldBeEnabledForClusterFrame = (extension: LensRendererExtension) =>
      di.inject(extensionShouldBeEnabledForClusterFrameInjectable, extension);

    return (ext) => {
      const extension = ext as LensRendererExtension;

      const extensionShouldBeEnabledForClusterFrame = getExtensionShouldBeEnabledForClusterFrame(extension);

      return extension.kubeObjectStatusTexts.map((registration) => {
        const id = `kube-object-status-text-registration-from-${extension.sanitizedExtensionId}-${getRandomId()}`;

        return getInjectable({
          id,

          instantiate: () => ({
            ...registration,

            enabled: computed(() => {
              if (!extensionShouldBeEnabledForClusterFrame.value.get()) {
                return false;
              }

              return registration.visible ? registration.visible.get() : true;
            }),
          }),

          injectionToken: kubeObjectStatusTextInjectionToken,
        });
      });
    };
  },

  injectionToken: extensionRegistratorInjectionToken,
});

export default kubeObjectStatusTextRegistratorInjectable;
