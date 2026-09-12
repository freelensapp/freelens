/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { NodeApi, PodApi } from "@freelensapp/kube-api";
import { AuthorizationV1Api } from "@kubernetes/client-node";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import createCanIInjectable from "../../../common/cluster/create-can-i.injectable";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import loadProxyKubeconfigInjectable from "../../../main/cluster/load-proxy-kubeconfig.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import { DebugContainers } from "./debug-containers";

import type { Cluster } from "../../../common/cluster/cluster";

const debugContainersInjectable = getInjectable({
  id: "debug-containers",
  instantiate: (di, cluster: Cluster) => {
    const createApi = di.inject(createKubeApiInjectable);
    const request = di.inject(createKubeJsonApiForClusterInjectable)(cluster.id);
    const loadKubeconfig = di.inject(loadProxyKubeconfigInjectable, cluster);
    const createCanI = di.inject(createCanIInjectable);
    const createKubectl = di.inject(createKubectlInjectable);
    const manager = di.inject(kubeconfigManagerInjectable, cluster);
    const execFile = di.inject(execFileInjectable);

    return new DebugContainers({
      podApi: createApi(PodApi, { request }),
      nodeApi: createApi(NodeApi, { request }),
      canI: async (attributes) => createCanI((await loadKubeconfig()).makeApiClient(AuthorizationV1Api))(attributes),
      execInPod: async (reference, command) => {
        const kubectl = createKubectl(cluster.version.get());
        const kubeconfig = await manager.ensurePath();

        await kubectl.ensureKubectl();
        const result = await execFile(
          await kubectl.getPath(),
          [
            "--kubeconfig",
            kubeconfig,
            "exec",
            "--namespace",
            reference.namespace,
            reference.name,
            "--container",
            reference.containerName,
            "--",
            ...command,
          ],
          { timeout: 15000, windowsHide: true },
        );

        if (!result.callWasSuccessful) throw new Error(result.error.stderr || result.error.message);
      },
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({ getInstanceKey: (_di, cluster: Cluster) => cluster.id }),
});

export default debugContainersInjectable;
