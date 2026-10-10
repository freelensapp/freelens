/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { describeCustomResourceRegistration, getCustomResourcesOfRegistration } from "./custom-resource-registration";
import { extensionCustomResourceInjectionToken } from "./extension-custom-resource-injection-token";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import type { RegisteredCustomResource } from "./custom-resource-registration";

const extensionCustomResourceRegistratorInjectable = getInjectable({
  id: "extension-custom-resource-registrator",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const extensionShouldBeEnabledForClusterFrame = di.inject(
        extensionShouldBeEnabledForClusterFrameInjectable,
        extension,
      );
      const enabled = computed(() => extensionShouldBeEnabledForClusterFrame.value.get());

      // By "group/plural": the classes of two versions of one kind name the
      // same resource.
      const resources = new Map<string, RegisteredCustomResource>();

      // `register()` runs the registrators of every extension in one loop, so
      // a registration that throws here would stop the extensions after this
      // one from registering anything. A rejected one is logged and skipped
      // instead, and its resource stays in the Custom Resources tree.
      extension.customResources.forEach((registration, index) => {
        try {
          for (const resource of getCustomResourcesOfRegistration(registration)) {
            resources.set(`${resource.group}/${resource.plural}`, resource);
          }
        } catch (error) {
          logger.error(
            `[EXTENSIONS]: ${extension.name}: ${describeCustomResourceRegistration(registration, index)} is rejected: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      });

      return Array.from(resources, ([key, { group, plural }]) =>
        getInjectable({
          id: `extension-custom-resource-from-${extension.sanitizedExtensionId}-${key}`,

          instantiate: () => ({
            group,
            plural,
            extensionName: extension.name,
            enabled,
          }),

          injectionToken: extensionCustomResourceInjectionToken,
        }),
      );
    };
  },

  injectionToken: extensionRegistratorInjectionToken,
});

export default extensionCustomResourceRegistratorInjectable;
