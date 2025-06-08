/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeJsonApiData } from "@freelensapp/kube-object";
import { pipeline } from "@ogre-tools/fp";
import { getInjectable } from "@ogre-tools/injectable";
import yaml from "js-yaml";
import { map } from "lodash/fp";
import type { JsonObject } from "type-fest";
import { defaultYamlDumpOptions } from "../../../../../common/kube-helpers";
import { getErrorMessage } from "../../../../../common/utils/get-error-message";
import execFileWithInputInjectable from "./exec-file-with-input/exec-file-with-input.injectable";

export type CallForKubeResourcesByManifest = (
  namespace: string,
  kubeconfigPath: string,
  kubectlPath: string,
  resourceManifests: KubeJsonApiData[],
) => Promise<JsonObject[]>;

const callForKubeResourcesByManifestInjectable = getInjectable({
  id: "call-for-kube-resources-by-manifest",

  instantiate: (di): CallForKubeResourcesByManifest => {
    const execFileWithInput = di.inject(execFileWithInputInjectable);

    return async (namespace, kubeconfigPath, kubectlPath, resourceManifests) => {
      const input = pipeline(
        resourceManifests,
        map((manifest) => yaml.dump(manifest, defaultYamlDumpOptions)),
        wideJoin("---\n"),
      );

      const result = await execFileWithInput({
        filePath: kubectlPath,
        input,

        commandArguments: [
          "get",
          "--kubeconfig",
          kubeconfigPath,
          "-f",
          "-",
          "--namespace",
          namespace,
          "--output",
          "json",
        ],
      });

      if (!result.callWasSuccessful) {
        const errorMessage = getErrorMessage(result.error);

        throw new Error(errorMessage);
      }

      const output = JSON.parse(result.response) as { items: JsonObject[] };

      return output.items;
    };
  },
});

export default callForKubeResourcesByManifestInjectable;

const wideJoin = (joiner: string) => (items: string[]) => `${joiner}${items.join(joiner)}${joiner}`;
