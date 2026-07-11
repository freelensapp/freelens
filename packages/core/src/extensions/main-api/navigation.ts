/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import navigateInjectable from "../../main/start-main-application/lens-window/navigate.injectable";
import { getEnvironmentSpecificDiForExtensionApi } from "../extension-api-di";

export function navigate(url: string) {
  const di = getEnvironmentSpecificDiForExtensionApi("main");
  const navigate = di.inject(navigateInjectable);

  return navigate(url);
}
