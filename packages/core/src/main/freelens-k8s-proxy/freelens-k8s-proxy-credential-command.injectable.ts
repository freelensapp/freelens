/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import binaryNameInjectable from "../../common/utils/binary-name.injectable";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import freeLensK8sProxyPathInjectable from "./freelens-k8s-proxy-path.injectable";

/**
 * The `command` of the credential plugin in the proxy kubeconfig.
 *
 * On Windows it is the bare file name, found on `PATH`, because a kubectl in
 * WSL reads the same kubeconfig: it cannot run a `C:\` path, but it runs a
 * Windows `.exe` it finds on the `PATH` that WSL appends from Windows. The name
 * keeps its `.exe`, as the Linux lookup needs the exact file name. Every
 * process given the kubeconfig gets the bundled binaries directory on its
 * `PATH`, from `composeKubeToolsEnvironment` or `withFreelensProxyCredentialEnv`.
 *
 * Elsewhere it is the absolute path, which no other binary on `PATH` can
 * shadow.
 */
const freelensK8sProxyCredentialCommandInjectable = getInjectable({
  id: "freelens-k8s-proxy-credential-command",
  instantiate: (di) =>
    di.inject(isWindowsInjectable)
      ? di.inject(binaryNameInjectable, "freelens-k8s-proxy")
      : di.inject(freeLensK8sProxyPathInjectable),
});

export default freelensK8sProxyCredentialCommandInjectable;
