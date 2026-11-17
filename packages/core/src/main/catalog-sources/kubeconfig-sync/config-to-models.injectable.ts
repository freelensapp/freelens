/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { splitConfig } from "../../../common/kube-helpers";
import kubeconfigSyncLoggerInjectable from "./logger.injectable";

import type { UpdateClusterModel } from "../../../common/cluster-types";
import type { KubeConfigData } from "../../../common/kube-config";

export type ConfigToModels = (rootConfig: KubeConfigData, filePath: string) => UpdateClusterModel[];

const configToModelsInjectable = getInjectable({
  id: "config-to-models",
  instantiate: (di): ConfigToModels => {
    const logger = di.inject(kubeconfigSyncLoggerInjectable);

    return (rootConfig, filePath) => {
      const validConfigs: ReturnType<ConfigToModels> = [];

      for (const { config, validationResult } of splitConfig(rootConfig)) {
        if (validationResult.error) {
          logger.debug(`context failed validation: ${validationResult.error}`, {
            context: config.currentContext,
            filePath,
          });
        } else {
          validConfigs.push({
            kubeConfigPath: filePath,
            contextName: config.currentContext,
          });
        }
      }

      return validConfigs;
    };
  },
});

export default configToModelsInjectable;
