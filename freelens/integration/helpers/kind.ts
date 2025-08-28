/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { spawnSync } from "child_process";

export function kindReady(kindClusterName: string, testNamespace: string): boolean {
  // determine if kind is running
  {
    const { status } = spawnSync(`kind get kubeconfig --name ${kindClusterName}`, { shell: true });

    if (status !== 0) {
      console.warn("kind not running");

      return false;
    }
  }

  // Remove TEST_NAMESPACE if it already exists
  {
    const { status } = spawnSync(`kubectl --context kind-${kindClusterName} get namespace ${testNamespace}`, {
      shell: true,
    });

    if (status === 0) {
      console.warn(`Removing existing ${testNamespace} namespace`);

      const { status, stdout, stderr } = spawnSync(
        `kubectl --context kind-${kindClusterName} delete namespace ${testNamespace}`,
        {
          shell: true,
        },
      );

      if (status !== 0) {
        console.warn(`Error removing ${testNamespace} namespace: ${stderr.toString()}`);

        return false;
      }

      console.log(stdout.toString());
    }
  }

  return true;
}
