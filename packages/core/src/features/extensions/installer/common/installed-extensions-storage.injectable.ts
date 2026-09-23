/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isDefined } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { action, toJS } from "mobx";
import createPersistentStorageInjectable from "../../../persistent-storage/common/create.injectable";
import { installedExtensionEntryModel } from "./installed-extensions";
import installedExtensionsStateInjectable from "./installed-extensions-state.injectable";

import type { InstalledExtensionEntry } from "./installed-extensions";

interface InstalledExtensionsStorageModel {
  extensions: [string, InstalledExtensionEntry][];
}

/**
 * The on-disk form of the installed-extension registry.
 *
 * An entry which does not validate is dropped rather than repaired: a record
 * we cannot read is a record we cannot load an extension from, and the sweep
 * then collects its directory as an orphan.
 */
const installedExtensionsPersistentStorageInjectable = getInjectable({
  id: "installed-extensions-persistent-storage",
  instantiate: (di) => {
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const state = di.inject(installedExtensionsStateInjectable);

    return createPersistentStorage<InstalledExtensionsStorageModel>({
      configName: "installed-extensions",
      fromStore: action(({ extensions: rawExtensions = [] }) => {
        const extensions = rawExtensions
          .map(([name, entry]) => {
            const verification = installedExtensionEntryModel.safeParse(entry);

            if (!verification.success) {
              return undefined;
            }

            return [name, verification.data] as const;
          })
          .filter(isDefined);

        state.replace(extensions);
      }),
      toJSON: () => ({
        extensions: [...toJS(state)],
      }),
    });
  },
});

export default installedExtensionsPersistentStorageInjectable;
