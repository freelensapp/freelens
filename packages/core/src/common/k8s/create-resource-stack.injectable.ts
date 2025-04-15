/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type { KubernetesCluster } from "../catalog-entities";
import readDirectoryInjectable from "../fs/read-directory.injectable";
import readFileInjectable from "../fs/read-file.injectable";
import { kubectlApplyAllInjectionToken, kubectlDeleteAllInjectionToken } from "../kube-helpers/channels";
import joinPathsInjectable from "../path/join-paths.injectable";
import type { ResourceApplyingStack, ResourceStackDependencies } from "./resource-stack";
import { ResourceStack } from "./resource-stack";

export type CreateResourceStack = (cluster: KubernetesCluster, name: string) => ResourceApplyingStack;

const createResourceStackInjectable = getInjectable({
  id: "create-resource-stack",
  instantiate: (di): CreateResourceStack => {
    const deps: ResourceStackDependencies = {
      joinPaths: di.inject(joinPathsInjectable),
      kubectlApplyAll: di.inject(kubectlApplyAllInjectionToken),
      kubectlDeleteAll: di.inject(kubectlDeleteAllInjectionToken),
      logger: di.inject(loggerInjectionToken),
      readDirectory: di.inject(readDirectoryInjectable),
      readFile: di.inject(readFileInjectable),
    };

    return (cluster, name) => new ResourceStack(deps, cluster, name);
  },
});

export default createResourceStackInjectable;
