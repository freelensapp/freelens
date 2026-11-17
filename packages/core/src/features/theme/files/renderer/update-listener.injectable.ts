/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { runInAction } from "mobx";
import { importedThemesUpdateChannel } from "../common/channels";
import importedThemesStateInjectable from "./imported-themes-state.injectable";

const importedThemesUpdateListenerInjectable = getMessageChannelListenerInjectable({
  channel: importedThemesUpdateChannel,
  id: "renderer",
  getHandler: (di) => {
    const state = di.inject(importedThemesStateInjectable);

    return (themes) => runInAction(() => state.set(themes));
  },
});

export default importedThemesUpdateListenerInjectable;
