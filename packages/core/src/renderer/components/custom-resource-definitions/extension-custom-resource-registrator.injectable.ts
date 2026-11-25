/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import {
  describeCustomResourceRegistration,
  describeCustomResourcesField,
  getCustomResourceKey,
  getCustomResourcesOfRegistration,
} from "./custom-resource-registration";
import { extensionCustomResourceInjectionToken } from "./extension-custom-resource-injection-token";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import type { CustomResourceRegistration, RegisteredCustomResource } from "./custom-resource-registration";

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
      const registrations: unknown = extension.customResources;

      // A field that is not an array registers nothing, with one error that
      // names what the field holds.
      if (!Array.isArray(registrations)) {
        logger.error(
          `[EXTENSIONS]: ${extension.name}: customResources is rejected: it is not an array but ${describeCustomResourcesField(
            registrations,
          )}`,
        );

        return [];
      }

      // A rejected entry is logged and skipped, so it costs only its own
      // resource, which stays in the Custom Resources tree.
      registrations.forEach((registration: CustomResourceRegistration, index) => {
        try {
          for (const resource of getCustomResourcesOfRegistration(registration)) {
            resources.set(getCustomResourceKey(resource.group, resource.plural), resource);
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
