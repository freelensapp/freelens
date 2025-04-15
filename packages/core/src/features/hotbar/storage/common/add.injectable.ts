/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import activeHotbarIdInjectable from "./active-id.injectable";
import createHotbarInjectable from "./create-hotbar.injectable";
import hotbarsStateInjectable from "./state.injectable";
import type { CreateHotbarData, CreateHotbarOptions } from "./types";

export type AddHotbar = (data: CreateHotbarData, options?: CreateHotbarOptions) => void;

const addHotbarInjectable = getInjectable({
  id: "add-hotbar",
  instantiate: (di): AddHotbar => {
    const state = di.inject(hotbarsStateInjectable);
    const activeHotbarId = di.inject(activeHotbarIdInjectable);
    const createHotbar = di.inject(createHotbarInjectable);

    return action((data, options = {}) => {
      const hotbar = createHotbar(data);

      state.set(hotbar.id, hotbar);

      if (options?.setActive) {
        activeHotbarId.set(hotbar.id);
      }
    });
  },
});

export default addHotbarInjectable;
