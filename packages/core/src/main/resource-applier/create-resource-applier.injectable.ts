/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../common/app-event-bus/emit-event.injectable";
import type { Cluster } from "../../common/cluster/cluster";
import execFileInjectable from "../../common/fs/exec-file.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../kubectl/create-kubectl.injectable";
import { ResourceApplier } from "./resource-applier";

const resourceApplierInjectable = getInjectable({
  id: "resource-applier",
  instantiate: (di, cluster) =>
    new ResourceApplier(
      {
        deleteFile: di.inject(removePathInjectable),
        emitAppEvent: di.inject(emitAppEventInjectable),
        execFile: di.inject(execFileInjectable),
        joinPaths: di.inject(joinPathsInjectable),
        logger: di.inject(loggerInjectionToken),
        writeFile: di.inject(writeFileInjectable),
        createKubectl: di.inject(createKubectlInjectable),
        proxyKubeconfigManager: di.inject(kubeconfigManagerInjectable, cluster),
      },
      cluster,
    ),
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default resourceApplierInjectable;
