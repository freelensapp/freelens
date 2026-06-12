/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { setLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import { runInAction } from "mobx";
import { registerInjectables } from "../register-injectables-renderer";

import type { Environments } from "@freelensapp/legacy-global-di";

import type { DiContainer } from "@ogre-tools/injectable";

export function registerLensCore(di: DiContainer, environment: Environments) {
  setLegacyGlobalDiForExtensionApi(di, environment);

  runInAction(() => {
    registerInjectables(di);
  });
}
