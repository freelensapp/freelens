/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import * as lockFile from "proper-lockfile";
import writeFileInjectable from "../../../common/fs/write-file.injectable";

import type { KubeConfigData } from "../../../common/kube-config";

export type SaveKubeconfig = (config: KubeConfigData, path: string) => Promise<void>;

const saveKubeconfigInjectable = getInjectable({
  id: "save-kubeconfig",
  instantiate: (di): SaveKubeconfig => {
    const writeFile = di.inject(writeFileInjectable);

    return async (config, filePath) => {
      const release = await lockFile.lock(filePath);

      try {
        // What `dumpYaml` of @kubernetes/client-node writes for a kubeconfig, which
        // it passes on as it is, without bundling the API models that it imports.
        const contents = yaml.dump(JSON.parse(config.exportConfig()));

        await writeFile(filePath, contents);
      } finally {
        await release();
      }
    };
  },
  causesSideEffects: true,
});

export default saveKubeconfigInjectable;
