/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import lensProxyCertificateInjectable from "../../common/certificate/lens-proxy-certificate.injectable";
import loadKubeconfigInjectable from "../../common/cluster/load-kubeconfig.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import readFileInjectable from "../../common/fs/read-file.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import getAbsolutePathInjectable from "../../common/path/get-absolute-path.injectable";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import resolveTildeInjectable from "../../common/path/resolve-tilde.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import kubeAuthProxyUrlInjectable from "../cluster/auth-proxy-url.injectable";
import kubeAuthProxyServerInjectable from "../cluster/kube-auth-proxy-server.injectable";
import { KubeconfigManager } from "./kubeconfig-manager";

import type { Cluster } from "../../common/cluster/cluster";

const kubeconfigManagerInjectable = getInjectable({
  id: "kubeconfig-manager",

  instantiate: (di, cluster) => {
    const state = di.inject(userPreferencesStateInjectable);

    return new KubeconfigManager(
      {
        directoryForTemp: di.inject(directoryForTempInjectable),
        logger: di.inject(loggerInjectionToken),
        joinPaths: di.inject(joinPathsInjectable),
        getDirnameOfPath: di.inject(getDirnameOfPathInjectable),
        getAbsolutePath: di.inject(getAbsolutePathInjectable),
        resolveTilde: di.inject(resolveTildeInjectable),
        removePath: di.inject(removePathInjectable),
        pathExists: di.inject(pathExistsInjectable),
        readFile: di.inject(readFileInjectable),
        writeFile: di.inject(writeFileInjectable),
        certificate: di.inject(lensProxyCertificateInjectable).get(),
        loadKubeconfig: di.inject(loadKubeconfigInjectable, cluster),
        kubeAuthProxyServer: di.inject(kubeAuthProxyServerInjectable, cluster),
        kubeAuthProxyUrl: di.inject(kubeAuthProxyUrlInjectable, cluster),
        isBypassEnabled: () => state.bypassKubeApiProxy,
      },
      cluster,
    );
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default kubeconfigManagerInjectable;
