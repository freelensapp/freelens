/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Runs the host's kubectl the way an extension is meant to: the path and the
// environment both come from `Main.Shell`, the environment is passed as `env`,
// and nothing is looked up in the host's directory layout.

import { execFile } from "node:child_process";
import { Main } from "@freelensapp/extensions";

export interface HostKubectlResult {
  kubectlPath: string;
  stdout: string;
}

export const runHostKubectl = async (
  clusterId?: string,
  options?: Main.Shell.KubectlDownloadOptions,
): Promise<HostKubectlResult> => {
  const kubectlPath =
    clusterId === undefined ? await Main.Shell.getKubectlPath() : await Main.Shell.getKubectlPath(clusterId, options);
  const env =
    clusterId === undefined ? await Main.Shell.getEnvironment() : await Main.Shell.getEnvironment(clusterId, options);

  return new Promise((resolve, reject) => {
    execFile(kubectlPath, ["version", "--client", "--output", "json"], { env }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve({ kubectlPath, stdout });
      }
    });
  });
};
