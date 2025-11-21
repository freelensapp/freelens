/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { dump } from "js-yaml";
import tempy from "tempy";
import removePathInjectable from "../../common/fs/remove.injectable";
import writeFileInjectable from "../../common/fs/write-file.injectable";
import execHelmInjectable from "./exec-helm/exec-helm.injectable";

import type { JsonValue } from "type-fest";

export interface InstallHelmChartData {
  chart: string;
  values: JsonValue;
  name: string;
  namespace: string;
  version: string;
  kubeconfigPath: string;
  forceConflicts?: boolean;
}

export interface InstallHelmChartResult {
  log: string;
  release: {
    name: string;
    namespace: string;
  };
}

export type InstallHelmChart = (data: InstallHelmChartData) => Promise<InstallHelmChartResult>;

const installHelmChartInjectable = getInjectable({
  id: "install-helm-chart",
  instantiate: (di): InstallHelmChart => {
    const writeFile = di.inject(writeFileInjectable);
    const removePath = di.inject(removePathInjectable);
    const execHelm = di.inject(execHelmInjectable);

    return async ({ chart, kubeconfigPath, name, namespace, values, version, forceConflicts }) => {
      const valuesFilePath = tempy.file({ name: "values.yaml" });

      await writeFile(valuesFilePath, dump(values));

      const args = ["install"];

      if (name) {
        args.push(name);
      }

      args.push(
        chart,
        "--version",
        version,
        "--values",
        valuesFilePath,
        "--namespace",
        namespace,
        "--kubeconfig",
        kubeconfigPath,
      );

      if (!name) {
        args.push("--generate-name");
      }

      if (forceConflicts) {
        args.push("--force-conflicts", "--server-side=true");
      }

      try {
        const result = await execHelm(args);

        if (!result.callWasSuccessful) {
          throw result.error;
        }

        const output = result.response;
        const releaseName = output.split("\n")[0].split(" ")[1].trim();

        return {
          log: output,
          release: {
            name: releaseName,
            namespace,
          },
        };
      } finally {
        await removePath(valuesFilePath);
      }
    };
  },
});

export default installHelmChartInjectable;
