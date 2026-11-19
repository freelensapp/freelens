/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, getKeyedSingletonCompositeKey, lifecycleEnum } from "@ogre-tools/injectable";
import { action, observable } from "mobx";

import type { KubernetesCluster } from "../../common/catalog-entities";
import type { LensRendererExtension } from "../lens-renderer-extension";

interface ExtensionIsEnabledForCluster {
  extension: LensRendererExtension;
  cluster: KubernetesCluster;
}

const extensionIsEnabledForClusterInjectable = getInjectable({
  id: "extension-is-enabled-for-cluster",

  instantiate: (di, { extension, cluster }: ExtensionIsEnabledForCluster) => {
    const logger = di.inject(loggerInjectionToken);
    const result = observable.box<boolean | undefined>(undefined);

    const check = async () => {
      try {
        return await extension.isEnabledForCluster(cluster);
      } catch (error) {
        logger.error(`[EXTENSIONS]: ${extension.name}: cluster eligibility check failed for ${cluster.getId()}`, error);

        return false;
      }
    };

    void check().then(
      action((allowed) => {
        result.set(allowed === true);
      }),
    );

    return result;
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { extension, cluster }: ExtensionIsEnabledForCluster) =>
      getKeyedSingletonCompositeKey(extension, cluster.getId()),
  }),
});

export default extensionIsEnabledForClusterInjectable;
