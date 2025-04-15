/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensExtensionId } from "@freelensapp/legacy-extensions";
import { isDefined } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { action, toJS } from "mobx";
import z from "zod";
import createPersistentStorageInjectable from "../../../persistent-storage/common/create.injectable";
import persistentStorageMigrationsInjectable from "../../../persistent-storage/common/migrations.injectable";
import { enabledExtensionsMigrationDeclarationInjectionToken } from "../main/migrations";
import type { LensExtensionState } from "./state.injectable";
import enabledExtensionsStateInjectable from "./state.injectable";
import { enabledExtensionsPersistentStorageVersionInitializable } from "./storage-version";

const stateModel = z.object({
  enabled: z.boolean(),
  name: z.string(),
});

interface EnabledExtensionsStorageModal {
  extensions: [LensExtensionId, LensExtensionState][];
}

const enabledExtensionsPersistentStorageInjectable = getInjectable({
  id: "enabled-extensions-persistent-storage",
  instantiate: (di) => {
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const state = di.inject(enabledExtensionsStateInjectable);

    return createPersistentStorage<EnabledExtensionsStorageModal>({
      configName: "lens-extensions",
      fromStore: action(({ extensions: rawExtensions = [] }) => {
        const extensions = rawExtensions
          .map(([key, value]) => {
            const verification = stateModel.safeParse(value);

            if (!verification.success) {
              return undefined;
            }

            return [key, verification.data] as const;
          })
          .filter(isDefined);

        state.replace(extensions);
      }),
      toJSON: () => ({
        extensions: [...toJS(state)],
      }),
      projectVersion: di.inject(enabledExtensionsPersistentStorageVersionInitializable.stateToken),
      migrations: di.inject(persistentStorageMigrationsInjectable, enabledExtensionsMigrationDeclarationInjectionToken),
    });
  },
});

export default enabledExtensionsPersistentStorageInjectable;
