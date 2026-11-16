/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { beforeFrameStartsSecondInjectionToken } from "../../../../renderer/before-frame-starts/tokens";
import { initialImportedThemesChannel } from "../common/channels";
import importedThemesStateInjectable from "./imported-themes-state.injectable";

const initializeImportedThemesInjectable = getInjectable({
  id: "initialize-imported-themes",
  instantiate: (di) => ({
    run: async () => {
      const requestFromChannel = di.inject(requestFromChannelInjectionToken);
      const state = di.inject(importedThemesStateInjectable);
      const themes = await requestFromChannel(initialImportedThemesChannel);

      runInAction(() => state.set(themes));
    },
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default initializeImportedThemesInjectable;
