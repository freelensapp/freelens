/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import directoryForKubeConfigsInjectable from "../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import kubeconfigSyncsInjectable from "../../../features/user-preferences/common/kubeconfig-syncs.injectable";
import kubeconfigSyncLoggerInjectable from "./logger.injectable";
import { KubeconfigSyncManager } from "./manager";
import watchKubeconfigFileChangesInjectable from "./watch-file-changes.injectable";

const kubeconfigSyncManagerInjectable = getInjectable({
  id: "kubeconfig-sync-manager",

  instantiate: (di) =>
    new KubeconfigSyncManager({
      directoryForKubeConfigs: di.inject(directoryForKubeConfigsInjectable),
      logger: di.inject(kubeconfigSyncLoggerInjectable),
      watchKubeconfigFileChanges: di.inject(watchKubeconfigFileChangesInjectable),
      kubeconfigSyncs: di.inject(kubeconfigSyncsInjectable),
    }),
});

export default kubeconfigSyncManagerInjectable;
