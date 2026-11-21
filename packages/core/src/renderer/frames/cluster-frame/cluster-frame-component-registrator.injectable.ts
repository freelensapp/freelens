/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import guardExtensionComponentsInjectable from "../../extension-loader/guard-extension-components.injectable";

import type { ExtensionRegistrator } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";

const clusterFrameComponentRegistratorInjectable = getInjectable({
  id: "cluster-frame-component-registrator",

  instantiate: (di): ExtensionRegistrator => {
    const guardExtensionComponents = di.inject(guardExtensionComponentsInjectable);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const guard = guardExtensionComponents(extension, "clusterFrameComponents");

      return extension.clusterFrameComponents.map((clusterFrameComponentRegistration) => {
        const id = `${extension.sanitizedExtensionId}-${clusterFrameComponentRegistration.id}`;
        const Component = guard.component(clusterFrameComponentRegistration.Component, { fallback: "nothing" });

        return getInjectable({
          id,
          injectionToken: clusterFrameChildComponentInjectionToken,
          instantiate: () => ({
            id,
            shouldRender: clusterFrameComponentRegistration.shouldRender,
            Component,
          }),
        });
      });
    };
  },
  injectionToken: extensionRegistratorInjectionToken,
});

export default clusterFrameComponentRegistratorInjectable;
