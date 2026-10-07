/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import freelensProxyCertificateInjectable from "../../common/certificate/freelens-proxy-certificate.injectable";
import loadKubeconfigInjectable from "../../common/cluster/load-kubeconfig.injectable";
import ensureDirInjectable from "../../common/fs/ensure-dir.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import freelensK8sProxyServerInjectable from "../cluster/freelens-k8s-proxy-server.injectable";
import freelensProxyClusterUrlInjectable from "../cluster/freelens-proxy-cluster-url.injectable";
import { KubeconfigManager } from "./kubeconfig-manager";

import type { Cluster } from "../../common/cluster/cluster";

const kubeconfigManagerInjectable = getInjectable({
  id: "kubeconfig-manager",

  instantiate: (di, cluster) =>
    new KubeconfigManager(
      {
        directoryForTemp: di.inject(directoryForTempInjectable),
        logger: di.inject(loggerInjectionToken),
        joinPaths: di.inject(joinPathsInjectable),
        getDirnameOfPath: di.inject(getDirnameOfPathInjectable),
        removePath: di.inject(removePathInjectable),
        pathExists: di.inject(pathExistsInjectable),
        writeFile: di.inject(writeFileInjectable),
        ensureDirectory: di.inject(ensureDirInjectable),
        certificate: di.inject(freelensProxyCertificateInjectable).get(),
        loadKubeconfig: di.inject(loadKubeconfigInjectable, cluster),
        freelensK8sProxyServer: di.inject(freelensK8sProxyServerInjectable, cluster),
        freelensProxyClusterUrl: di.inject(freelensProxyClusterUrlInjectable, cluster),
      },
      cluster,
    ),
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default kubeconfigManagerInjectable;
