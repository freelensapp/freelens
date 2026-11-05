/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { loadConfigFromString } from "../kube-helpers";
import resolveTildeInjectable from "../path/resolve-tilde.injectable";
import readKubeconfigFileInjectable from "./read-kubeconfig-file.injectable";

import type { ConfigResult } from "../kube-helpers";

export type LoadConfigFromFile = (filePath: string) => Promise<ConfigResult>;

const loadConfigFromFileInjectable = getInjectable({
  id: "load-config-from-file",
  instantiate: (di): LoadConfigFromFile => {
    const readKubeconfigFile = di.inject(readKubeconfigFileInjectable);
    const resolveTilde = di.inject(resolveTildeInjectable);

    return async (filePath) => loadConfigFromString(await readKubeconfigFile(resolveTilde(filePath)));
  },
});

export default loadConfigFromFileInjectable;
