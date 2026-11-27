/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { describeCustomResourcesField } from "../custom-resource-definitions/custom-resource-registration";
import {
  checkCustomResourceColumnsRegistration,
  describeCustomResourceColumnsRegistration,
} from "./custom-resource-columns-registration";
import { extensionCustomResourceColumnsInjectionToken } from "./extension-custom-resource-columns-injection-token";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import type { ExtensionCustomResourceColumns } from "./extension-custom-resource-columns-injection-token";

const extensionCustomResourceColumnsRegistratorInjectable = getInjectable({
  id: "extension-custom-resource-columns-registrator",

  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);
    const getRandomId = di.inject(getRandomIdInjectionToken);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const extensionShouldBeEnabledForClusterFrame = di.inject(
        extensionShouldBeEnabledForClusterFrameInjectable,
        extension,
      );
      const enabled = computed(() => extensionShouldBeEnabledForClusterFrame.value.get());
      const registrations: unknown = extension.customResourceColumns;

      // A field that is not an array registers nothing, with one error that
      // names what the field holds.
      if (!Array.isArray(registrations)) {
        logger.error(
          `[EXTENSIONS]: ${extension.name}: customResourceColumns is rejected: it is not an array but ${describeCustomResourcesField(
            registrations,
          )}`,
        );

        return [];
      }

      // A rejected entry is logged and skipped, so it costs only its own
      // columns, which show as the host shows them.
      const accepted: Omit<ExtensionCustomResourceColumns, "extensionName" | "enabled">[] = [];

      registrations.forEach((registration: unknown, index) => {
        try {
          checkCustomResourceColumnsRegistration(registration);
          accepted.push({
            kind: registration.kind,
            apiVersions: [...registration.apiVersions],
            columns: { ...registration.columns },
          });
        } catch (error) {
          logger.error(
            `[EXTENSIONS]: ${extension.name}: ${describeCustomResourceColumnsRegistration(registration, index)} is rejected: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      });

      return accepted.map((registration) =>
        getInjectable({
          id: `extension-custom-resource-columns-from-${extension.sanitizedExtensionId}-${getRandomId()}`,

          instantiate: (): ExtensionCustomResourceColumns => ({
            ...registration,
            extensionName: extension.name,
            enabled,
          }),

          injectionToken: extensionCustomResourceColumnsInjectionToken,
        }),
      );
    };
  },

  injectionToken: extensionRegistratorInjectionToken,
});

export default extensionCustomResourceColumnsRegistratorInjectable;
