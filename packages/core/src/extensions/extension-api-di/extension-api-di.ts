/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainer } from "@ogre-tools/injectable";

export type Environments = "main" | "renderer";

const extensionApiDis = new Map<Environments, DiContainer>();

export const setDiForExtensionApi = (di: DiContainer, environment: Environments) => {
  extensionApiDis.set(environment, di);
};

export const getDiForExtensionApi = () => {
  if (extensionApiDis.size > 1) {
    throw new Error("Tried to get the extension API DI container where there is multiple containers available.");
  }

  const [di] = [...extensionApiDis.values()];

  if (!di) {
    throw new Error("Tried to get the extension API DI container where there is no containers available.");
  }

  return di;
};

export function getEnvironmentSpecificDiForExtensionApi(environment: Environments) {
  const di = extensionApiDis.get(environment);

  if (!di) {
    throw new Error("Tried to get the extension API DI container in environment which doesn't exist");
  }

  return di;
}
