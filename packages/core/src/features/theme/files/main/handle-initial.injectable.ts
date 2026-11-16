/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { initialImportedThemesChannel } from "../common/channels";
import importedThemesStateInjectable from "./imported-themes-state.injectable";

const initialImportedThemesListenerInjectable = getRequestChannelListenerInjectable({
  id: "initial-imported-themes-listener",
  channel: initialImportedThemesChannel,
  getHandler: (di) => {
    const state = di.inject(importedThemesStateInjectable);

    return () => state.get();
  },
});

export default initialImportedThemesListenerInjectable;
