/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import bundledKubectlInjectable from "../../../kubectl/bundled-kubectl.injectable";
import getPortFromStreamInjectable from "../../../utils/get-port-from-stream.injectable";
import type { PortForwardArgs, PortForwardDependencies } from "./port-forward";
import { PortForward } from "./port-forward";

export type CreatePortForward = (pathToKubeConfig: string, args: PortForwardArgs) => PortForward;

const createPortForwardInjectable = getInjectable({
  id: "create-port-forward",

  instantiate: (di): CreatePortForward => {
    const dependencies: PortForwardDependencies = {
      getKubectlBinPath: di.inject(bundledKubectlInjectable).getPath,
      getPortFromStream: di.inject(getPortFromStreamInjectable),
      logger: di.inject(loggerInjectionToken),
    };

    return (pathToKubeConfig, args) => new PortForward(dependencies, pathToKubeConfig, args);
  },
});

export default createPortForwardInjectable;
