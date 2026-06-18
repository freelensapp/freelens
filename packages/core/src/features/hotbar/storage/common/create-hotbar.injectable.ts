/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { Hotbar } from "./hotbar";

import type { CreateHotbarData } from "./types";

export type CreateHotbar = (data: CreateHotbarData) => Hotbar;

const createHotbarInjectable = getInjectable({
  id: "create-hotbar",
  instantiate: (): CreateHotbar => (data) => new Hotbar(data),
});

export default createHotbarInjectable;
