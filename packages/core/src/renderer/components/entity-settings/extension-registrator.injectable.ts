/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import guardExtensionComponentsInjectable from "../../extension-loader/guard-extension-components.injectable";
import { entitySettingInjectionToken } from "./token";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import type { CatalogEntity } from "../../api/catalog-entity";
import type { ExtensionComponentGuard } from "../../extension-loader/guard-extension-components.injectable";

export interface EntitySettingViewProps {
  entity: CatalogEntity;
}

export interface EntitySettingComponents {
  View: React.ComponentType<EntitySettingViewProps>;
}

export interface EntitySettingRegistration {
  apiVersions: string[];
  kind: string;
  title: string;
  components: EntitySettingComponents;
  source?: string;
  id?: string;
  priority?: number;
  group?: string;
}

export interface RegisteredEntitySetting {
  id: string;
  orderNumber: number;
  apiVersions: Set<string>;
  kind: string;
  title: string;
  components: EntitySettingComponents;
  source?: string;
  group: string;
}

const entitySettingExtensionRegistratorInjectable = getInjectable({
  id: "entity-setting-extension-registrator",
  instantiate: (di) => {
    const guardExtensionComponents = di.inject(guardExtensionComponentsInjectable);

    return (ext) => {
      const extension = ext as LensRendererExtension;
      const guard = guardExtensionComponents(extension, "entitySettings");

      return extension.entitySettings.map(getInjectableForEntitySettingRegistrationFor(extension, guard));
    };
  },
  injectionToken: extensionRegistratorInjectionToken,
});

export default entitySettingExtensionRegistratorInjectable;

const getInjectableForEntitySettingRegistrationFor =
  (extension: LensRendererExtension, guard: ExtensionComponentGuard) =>
  ({
    apiVersions,
    components,
    kind,
    title,
    group = "Extensions",
    id = btoa(title),
    priority,
    source,
  }: EntitySettingRegistration) =>
    getInjectable({
      id: `${extension.manifest.name}:${group}/${kind}:${id}`,
      instantiate: () => ({
        apiVersions: new Set(apiVersions),
        components: {
          ...components,
          View: guard.component(components.View, { fallback: "view", resetKey: ({ entity }) => entity }),
        },
        id,
        kind,
        orderNumber: priority ?? 50,
        title,
        group,
        source,
      }),
      injectionToken: entitySettingInjectionToken,
    });
