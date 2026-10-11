/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import directoryForBinariesInjectable from "../../common/app-paths/directory-for-binaries/directory-for-binaries.injectable";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import bundledBinaryPathInjectable from "../../common/utils/bundled-binary-path.injectable";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import bundledKubectlBinaryPathInjectable from "../kubectl/bundled-binary-path.injectable";
import { directoriesForPath } from "./kube-tools";

import type { Kubectl, KubectlProgressOptions } from "../kubectl/kubectl";
import type { KubeTools } from "./kube-tools";

export interface ResolveKubeTools {
  /**
   * The tools of a terminal opened outside any cluster: `kubectlBinariesPath`
   * and `helmBinariesPath`, else the bundled binaries, appended to `PATH`.
   */
  withoutCluster(): KubeTools;
  /**
   * The tools of a cluster terminal: the kubectl matched to the cluster's
   * version (see {@link Kubectl.getPath}), which may be downloaded, and helm as
   * without a cluster, all of them first on `PATH`.
   */
  forCluster(kubectl: Kubectl, options?: KubectlProgressOptions): Promise<KubeTools>;
}

const resolveKubeToolsInjectable = getInjectable({
  id: "resolve-kube-tools",

  instantiate: (di): ResolveKubeTools => {
    const state = di.inject(userPreferencesStateInjectable);
    const bundledKubectlBinaryPath = di.inject(bundledKubectlBinaryPathInjectable);
    // Not `helmBinaryPathInjectable`: that resolves the preference once, when
    // the injectable is instantiated, and a terminal opened after the user
    // changed it would still get the previous binary.
    const bundledHelmBinaryPath = di.inject(bundledBinaryPathInjectable, "helm");
    const directoryForBinaries = di.inject(directoryForBinariesInjectable);
    const baseBundledBinariesDirectory = di.inject(baseBundledBinariesDirectoryInjectable);
    const getDirnameOfPath = di.inject(getDirnameOfPathInjectable);

    const getHelmPath = () => state.helmBinariesPath || bundledHelmBinaryPath;

    return {
      withoutCluster: () => {
        const kubectlPath = state.kubectlBinariesPath || bundledKubectlBinaryPath;
        const helmPath = getHelmPath();

        return {
          kubectlPath,
          helmPath,
          pathPrefix: [],
          pathSuffix: directoriesForPath(getDirnameOfPath, [kubectlPath, helmPath], [directoryForBinaries]),
        };
      },
      forCluster: async (kubectl, options) => {
        const kubectlPath = await kubectl.getPath(options);
        const helmPath = getHelmPath();

        return {
          kubectlPath,
          helmPath,
          // The bundled binaries directory comes last, as the fallback for
          // whatever else the bundle ships.
          pathPrefix: directoriesForPath(
            getDirnameOfPath,
            [kubectlPath, helmPath],
            [directoryForBinaries, baseBundledBinariesDirectory],
          ),
          pathSuffix: [],
        };
      },
    };
  },
});

export default resolveKubeToolsInjectable;
