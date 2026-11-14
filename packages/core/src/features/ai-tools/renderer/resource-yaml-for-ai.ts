/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as yaml from "js-yaml";
import { defaultYamlDumpOptions } from "../../../common/kube-helpers";

export const resourceYamlForAi = (kind: string, value: Record<string, unknown>) => {
  const resource = structuredClone(value);

  if (kind === "Secret") {
    for (const field of ["data", "stringData"]) {
      const values = resource[field];

      if (values && typeof values === "object") {
        resource[field] = Object.fromEntries(Object.keys(values).map((key) => [key, "<redacted>"]));
      }
    }
  }

  return yaml.dump(resource, defaultYamlDumpOptions);
};
