/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeConfig } from "@freelensapp/kubernetes-client-node";
import { dumpYaml } from "@freelensapp/kubernetes-client-node";
import { getInjectable } from "@ogre-tools/injectable";
import * as lockFile from "proper-lockfile";
import writeFileInjectable from "../../../common/fs/write-file.injectable";

export type SaveKubeconfig = (config: KubeConfig, path: string) => Promise<void>;

const saveKubeconfigInjectable = getInjectable({
  id: "save-kubeconfig",
  instantiate: (di): SaveKubeconfig => {
    const writeFile = di.inject(writeFileInjectable);

    return async (config, filePath) => {
      const release = await lockFile.lock(filePath);

      try {
        const contents = dumpYaml(JSON.parse(config.exportConfig()));

        await writeFile(filePath, contents);
      } finally {
        await release();
      }
    };
  },
  causesSideEffects: true,
});

export default saveKubeconfigInjectable;
