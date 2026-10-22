/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { freelensProxyTokenEnvVar } from "./freelens-proxy-token";
import freelensProxyTokenInjectable from "./freelens-proxy-token.injectable";

export type WithFreelensProxyTokenEnv = <T extends Record<string, string | undefined>>(env: T) => T;

/**
 * Adds the freelens-proxy token to the environment of a kubectl, helm or
 * terminal that Freelens starts against the proxy, so that the `credential`
 * subcommand named in the proxy kubeconfig reads it. Every place that spawns
 * such a tool passes its environment through this, so none is left without the
 * token and no kubeconfig holds it.
 *
 * It is opt-in, called next to where the proxy kubeconfig is put in the
 * environment, not globally: a future mode that runs a tool against a generated
 * kubeconfig pointing straight at the cluster (a chosen context, isolated from
 * the user's own file) does not go through the proxy and does not call this, and
 * the token would be inert there anyway, as that kubeconfig names no
 * `credential` plugin.
 */
const withFreelensProxyTokenEnvInjectable = getInjectable({
  id: "with-freelens-proxy-token-env",
  instantiate: (di): WithFreelensProxyTokenEnv => {
    const token = di.inject(freelensProxyTokenInjectable);

    return (env) => ({ ...env, [freelensProxyTokenEnvVar]: token.value });
  },
});

export default withFreelensProxyTokenEnvInjectable;
