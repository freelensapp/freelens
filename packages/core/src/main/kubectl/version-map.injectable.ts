/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { kubectlVersions } from "@freelensapp/kubectl-versions";
import { getInjectable } from "@ogre-tools/injectable";
import * as verkit from "verkit";
import bundledKubectlVersionInjectable from "../../common/vars/bundled-kubectl-version.injectable";

const kubectlVersionMapInjectable = getInjectable({
  id: "kubectl-version-map",
  instantiate: (di) => {
    const bundledKubectlVersion = di.inject(bundledKubectlVersionInjectable);
    const bundledKubectlSemVer = verkit.parse(bundledKubectlVersion);

    return new Map([
      ...kubectlVersions,
      [`${bundledKubectlSemVer.major}.${bundledKubectlSemVer.minor}`, bundledKubectlVersion],
    ]);
  },
});

export default kubectlVersionMapInjectable;
