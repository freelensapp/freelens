/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import dependencyInjectionContainerInjectable from "../common/dependency-injection/dependency-injection-container.injectable";
import { setDiForExtensionApi } from "../extensions/extension-api-di";
import { registerInjectables } from "../register-injectables-renderer";

import type { DiContainer } from "@ogre-tools/injectable";

import type { Environments } from "../extensions/extension-api-di";

export function registerLensCore(di: DiContainer, environment: Environments) {
  setDiForExtensionApi(di, environment);

  runInAction(() => {
    registerInjectables(di);
  });

  // Expose the root container so runtime differencing registrators can register
  // injectables container-level (bare ids), not namespaced under the caller.
  di.override(dependencyInjectionContainerInjectable, () => di);
}
