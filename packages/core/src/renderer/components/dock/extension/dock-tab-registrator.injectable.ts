/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { extensionRegistratorInjectionToken } from "../../../../extensions/extension-loader/extension-registrator-injection-token";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { registeredDockTabInjectionToken } from "./registered-dock-tabs.injectable";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { DockTabRegistration } from "./dock-tab-registration";

const dockTabRegistratorInjectable = getInjectable({
  id: "extension-dock-tab-registrator",
  injectionToken: extensionRegistratorInjectionToken,

  instantiate: (di) => (ext) => {
    const extension = ext as LensRendererExtension;

    if (!di.inject(hostedClusterIdInjectable)) return [];

    const declarations = extension.dockTabs;
    if (Array.isArray(declarations) && declarations.length === 0) return [];

    const clusterEnabled = di.inject(extensionShouldBeEnabledForClusterFrameInjectable, extension);
    const extensionName = extension.name;
    const ids = new Set<string>();

    const registrations = declarations.map((registration) => {
      const { id } = registration;

      if (!id.trim() || ids.has(id)) {
        throw new Error(`Dock tab IDs must be nonempty and unique within ${extensionName}`);
      }

      ids.add(id);

      return getInjectable({
        id: `extension-dock-tab-${JSON.stringify([extensionName, id])}`,
        injectionToken: registeredDockTabInjectionToken,
        instantiate: () => {
          let components: DockTabRegistration["components"] | undefined;

          return {
            id,
            owner: extension,
            extensionName,
            // The registry can enumerate every type without evaluating author code.
            get title() {
              return registration.title;
            },
            get components() {
              // Retain the component declaration across renders and retry if the accessor throws.
              return (components ??= registration.components);
            },
            pending: computed(() => extension.isEnabled && clusterEnabled.pending.get()),
            enabled: computed(
              () => extension.isEnabled && clusterEnabled.value.get() && (registration.enabled?.get() ?? true),
            ),
          };
        },
      });
    });

    // The loader observes this computed for the registration's lifetime. Start
    // cluster eligibility now, before a command-only extension first opens a tab.
    return computed(() => {
      clusterEnabled.value.get();

      return registrations;
    });
  },
});

export default dockTabRegistratorInjectable;
