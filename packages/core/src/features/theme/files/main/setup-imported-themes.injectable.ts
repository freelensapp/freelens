/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { importedThemesUpdateChannel } from "../common/channels";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import reloadImportedThemesInjectable from "./reload-imported-themes.injectable";
import watchThemesDirectoryInjectable from "./watch-themes-directory.injectable";

/**
 * Reads the themes directory at start and watches it, so that a file added, changed or removed by
 * hand shows up without a restart, and sends every change to all frames.
 */
const setupImportedThemesInjectable = getInjectable({
  id: "setup-imported-themes",
  instantiate: (di) => ({
    run: async () => {
      const reloadImportedThemes = di.inject(reloadImportedThemesInjectable);
      const state = di.inject(importedThemesStateInjectable);
      const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);
      const watchThemesDirectory = di.inject(watchThemesDirectoryInjectable);

      await reloadImportedThemes();

      reaction(
        () => state.get(),
        (themes) => sendMessageToChannel(importedThemesUpdateChannel, themes),
      );

      watchThemesDirectory(() => void reloadImportedThemes());
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default setupImportedThemesInjectable;
