/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncResult } from "@freelensapp/utilities";
import { isObject } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { ListedHelmRelease } from "../../features/helm-releases/common/channels";
import execHelmInjectable from "./exec-helm/exec-helm.injectable";

export type ListHelmReleases = (
  pathToKubeconfig: string,
  namespace?: string,
) => AsyncResult<ListedHelmRelease[], string>;

const listHelmReleasesInjectable = getInjectable({
  id: "list-helm-releases",
  instantiate: (di): ListHelmReleases => {
    const execHelm = di.inject(execHelmInjectable);

    return async (pathToKubeconfig, namespace) => {
      const args = [
        "ls",
        "--all",
        // By default 256 results are listed, we want to list practically all
        "--max",
        "9999",
        "--output",
        "json",
      ];

      if (namespace) {
        args.push("-n", namespace);
      } else {
        args.push("--all-namespaces");
      }

      args.push("--kubeconfig", pathToKubeconfig);

      const result = await execHelm(args);

      if (!result.callWasSuccessful) {
        return {
          callWasSuccessful: false,
          error: `Failed to list helm releases: ${result.error}`,
        };
      }

      const rawOutput = JSON.parse(result.response);
      const output = Array.isArray(rawOutput) ? rawOutput.filter(isObject) : [];

      return {
        callWasSuccessful: true,
        response: output as unknown as ListedHelmRelease[],
      };
    };
  },
});

export default listHelmReleasesInjectable;
