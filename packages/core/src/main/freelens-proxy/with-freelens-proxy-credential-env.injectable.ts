/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import { surroundPath } from "../kube-tools/kube-tools";
import { freelensProxyTokenEnvVar } from "./freelens-proxy-token";
import freelensProxyTokenInjectable from "./freelens-proxy-token.injectable";

export type WithFreelensProxyCredentialEnv = <T extends Record<string, string | undefined>>(env: T) => T;

/**
 * Adds what the `credential` subcommand named in the proxy kubeconfig needs to
 * the environment of a kubectl, helm or terminal that Freelens starts against
 * the proxy: the freelens-proxy token, which it reads, and on Windows the
 * bundled binaries directory at the end of `PATH`, where the bare command name
 * the kubeconfig gives there is found. Every place that spawns such a tool
 * passes its environment through this, so none is left without the token and
 * no kubeconfig holds it.
 *
 * It is opt-in, called next to where the proxy kubeconfig is put in the
 * environment, not globally: a future mode that runs a tool against a generated
 * kubeconfig pointing straight at the cluster (a chosen context, isolated from
 * the user's own file) does not go through the proxy and does not call this, and
 * the token would be inert there anyway, as that kubeconfig names no
 * `credential` plugin.
 */
const withFreelensProxyCredentialEnvInjectable = getInjectable({
  id: "with-freelens-proxy-credential-env",
  instantiate: (di): WithFreelensProxyCredentialEnv => {
    const token = di.inject(freelensProxyTokenInjectable);
    const isWindows = di.inject(isWindowsInjectable);
    const baseBundledBinariesDirectory = di.inject(baseBundledBinariesDirectoryInjectable);

    return (env) => {
      const result = { ...env, [freelensProxyTokenEnvVar]: token.value };

      if (isWindows) {
        surroundPath(result, [], [baseBundledBinariesDirectory], isWindows);
      }

      return result;
    };
  },
});

export default withFreelensProxyCredentialEnvInjectable;
