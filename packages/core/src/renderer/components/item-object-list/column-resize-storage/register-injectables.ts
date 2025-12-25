/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import columnResizeStorageInjectable from "./storage.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  try {
    di.register(columnResizeStorageInjectable);
  } catch (e) {
    /* Ignore duplicate registration */
  }
}
