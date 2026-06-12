/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import enabledExtensionsStateInjectable from "./state.injectable";

import type { LensExtensionId } from "@freelensapp/legacy-extensions";

import type { IObservableMapInitialValues } from "mobx";

import type { LensExtensionState } from "./state.injectable";

export type UpdateExtensionsState = (state: IObservableMapInitialValues<LensExtensionId, LensExtensionState>) => void;

const updateExtensionsStateInjectable = getInjectable({
  id: "update-extensions-state",
  instantiate: (di): UpdateExtensionsState => {
    const state = di.inject(enabledExtensionsStateInjectable);

    return action((newState) => state.merge(newState));
  },
});

export default updateExtensionsStateInjectable;
