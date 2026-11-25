/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import getDirnameOfPathInjectable from "../../common/path/get-dirname.injectable";
import bundledBinaryPathInjectable from "../../common/utils/bundled-binary-path.injectable";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import bundledKubectlBinaryPathInjectable from "../kubectl/bundled-binary-path.injectable";

import type { Kubectl, KubectlProgressOptions } from "../kubectl/kubectl";
import type { KubeTools } from "./kube-tools";

export interface ResolveKubeTools {
  /**
   * The tools of a terminal opened outside any cluster: `kubectlBinariesPath`
   * when downloading kubectl is turned off and `helmBinariesPath`, else the
   * bundled binaries, and the bundled binaries directory appended to `PATH`.
   */
  withoutCluster(): KubeTools;
  /**
   * The tools of a cluster terminal: the kubectl matched to the cluster's
   * version (see {@link Kubectl.getPath}), which may be downloaded, and helm as
   * without a cluster. The directory of the version-matched kubectl goes first
   * on `PATH` when that is the kubectl the cluster runs, and the bundled
   * binaries directory last.
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
    const baseBundledBinariesDirectory = di.inject(baseBundledBinariesDirectoryInjectable);
    const getDirnameOfPath = di.inject(getDirnameOfPathInjectable);

    const getHelmPath = () => state.helmBinariesPath || bundledHelmBinaryPath;

    return {
      withoutCluster: () => ({
        // The preference is greyed out while downloading is turned on, and
        // Freelens ignores it then, so the same goes here.
        kubectlPath: (!state.downloadKubectlBinaries && state.kubectlBinariesPath) || bundledKubectlBinaryPath,
        helmPath: getHelmPath(),
        pathPrefix: [],
        pathSuffix: [baseBundledBinariesDirectory],
      }),
      forCluster: async (kubectl, options) => {
        const kubectlPath = await kubectl.getPath(options);
        const versionMatchedPath = kubectl.getVersionMatchedPath();

        return {
          kubectlPath,
          helmPath: getHelmPath(),
          pathPrefix:
            state.downloadKubectlBinaries && kubectlPath === versionMatchedPath
              ? [getDirnameOfPath(versionMatchedPath)]
              : [],
          pathSuffix: [baseBundledBinariesDirectory],
        };
      },
    };
  },
});

export default resolveKubeToolsInjectable;
