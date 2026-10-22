/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import withFreelensProxyCredentialEnvInjectable from "../../../freelens-proxy/with-freelens-proxy-credential-env.injectable";
import bundledKubectlInjectable from "../../../kubectl/bundled-kubectl.injectable";
import getPortFromStreamInjectable from "../../../utils/get-port-from-stream.injectable";
import { PortForward } from "./port-forward";

import type { ProxyKubeconfigPaths } from "../../../kubeconfig-manager/kubeconfig-manager";
import type { PortForwardArgs, PortForwardDependencies } from "./port-forward";

export type CreatePortForward = (proxyKubeconfig: ProxyKubeconfigPaths, args: PortForwardArgs) => PortForward;

const createPortForwardInjectable = getInjectable({
  id: "create-port-forward",

  instantiate: (di): CreatePortForward => {
    const bundledKubectl = di.inject(bundledKubectlInjectable);
    const dependencies: PortForwardDependencies = {
      getKubectlBinPath: async () => bundledKubectl.getBundledPath(),
      getPortFromStream: di.inject(getPortFromStreamInjectable),
      logger: di.inject(loggerInjectionToken),
      withFreelensProxyCredentialEnv: di.inject(withFreelensProxyCredentialEnvInjectable),
    };

    return (proxyKubeconfig, args) => new PortForward(dependencies, proxyKubeconfig, args);
  },
});

export default createPortForwardInjectable;
