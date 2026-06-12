/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { Hotbar } from "./hotbar";

import type { HotbarDependencies } from "./hotbar";
import type { CreateHotbarData } from "./types";

export type CreateHotbar = (data: CreateHotbarData) => Hotbar;

const createHotbarInjectable = getInjectable({
  id: "create-hotbar",
  instantiate: (di): CreateHotbar => {
    const deps: HotbarDependencies = {
      logger: di.inject(prefixedLoggerInjectable, "HOTBAR"),
    };

    return (data) => new Hotbar(deps, data);
  },
});

export default createHotbarInjectable;
