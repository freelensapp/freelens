/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import { apiPrefix } from "../../../common/vars";
import withFreelensProxyCredentialEnvInjectable from "../../../main/freelens-proxy/with-freelens-proxy-credential-env.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import { payloadValidatedClusterRoute } from "../../../main/router/route";
import { getRouteInjectable } from "../../../main/router/router.injectable";
import { debugContainerReferenceError, debugContainerStopScript } from "../common/debug-container";

import type { DebugContainerReference } from "../common/debug-container";

const stopDebugContainerPayloadValidator = Joi.object<DebugContainerReference>({
  namespace: Joi.string().required(),
  pod: Joi.string().required(),
  container: Joi.string().required(),
}).custom((reference: DebugContainerReference, helpers) => {
  const error = debugContainerReferenceError(reference);

  return error ? helpers.message({ custom: error }) : reference;
});

const stopDebugContainerRouteInjectable = getRouteInjectable({
  id: "stop-debug-container-route",
  instantiate: (di) => {
    const createKubectl = di.inject(createKubectlInjectable);
    const execFile = di.inject(execFileInjectable);
    const withProxyCredentialEnv = di.inject(withFreelensProxyCredentialEnvInjectable);

    return payloadValidatedClusterRoute({
      method: "post",
      path: `${apiPrefix}/debug-containers/stop`,
      payloadValidator: stopDebugContainerPayloadValidator,
    })(async ({ cluster, payload }) => {
      const kubectl = createKubectl(cluster.version.get());
      const { kubeconfigPath, cacheDirectoryPath } = await di
        .inject(kubeconfigManagerInjectable, cluster)
        .ensurePaths();
      const result = await execFile(
        await kubectl.getPath(undefined, { whenBundleUnusable: "reject" }),
        [
          "--kubeconfig",
          kubeconfigPath,
          "exec",
          "--namespace",
          payload.namespace,
          payload.pod,
          `--container=${payload.container}`,
          "--",
          "sh",
          "-c",
          debugContainerStopScript,
        ],
        {
          timeout: 15_000,
          windowsHide: true,
          env: withProxyCredentialEnv({ ...process.env, KUBECACHEDIR: cacheDirectoryPath }),
        },
      );

      if (!result.callWasSuccessful) {
        return { statusCode: 400, error: { message: result.error.stderr.trim() || result.error.message } };
      }

      return { response: {} };
    });
  },
});

export default stopDebugContainerRouteInjectable;
