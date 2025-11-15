/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable, computed, action } from "mobx";
import { prefixedLoggerInjectable } from "@freelensapp/logger";
import createPersistentStorageInjectable from "../../features/persistent-storage/common/create.injectable";
import storeMigrationVersionInjectable from "../../common/vars/store-migration-version.injectable";

import type { LensTheme } from "./lens-theme";

export interface CustomThemesModel {
  themes: LensTheme[];
}

export interface CustomThemesStorage {
  readonly themes: LensTheme[];
  addTheme: (theme: LensTheme) => void;
  updateTheme: (name: string, theme: LensTheme) => void;
  removeTheme: (name: string) => void;
  getTheme: (name: string) => LensTheme | undefined;
}

const customThemesStorageInjectable = getInjectable({
  id: "custom-themes-storage",
  instantiate: (di): CustomThemesStorage => {
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "CUSTOM-THEMES");

    const themesObservable = observable.array<LensTheme>([]);

    const storage = createPersistentStorage<CustomThemesModel>({
      configName: "lens-custom-themes",
      projectVersion: di.inject(storeMigrationVersionInjectable),
      fromStore: action(({ themes = [] }) => {
        logger.debug("Loading custom themes from store", { themes });
        themesObservable.replace(themes.map((theme) => ({ ...theme, isCustom: true })));
      }),
      toJSON: () => ({
        themes: themesObservable.slice(),
      }),
    });

    return {
      themes: computed(() => themesObservable.slice()).get(),
      
      addTheme: action((theme: LensTheme) => {
        const themeWithCustomFlag = { ...theme, isCustom: true };
        themesObservable.push(themeWithCustomFlag);
        storage.saveToFile();
        logger.info(`Added custom theme: ${theme.name}`);
      }),

      updateTheme: action((name: string, theme: LensTheme) => {
        const index = themesObservable.findIndex((t) => t.name === name);
        
        if (index !== -1) {
          themesObservable[index] = { ...theme, isCustom: true };
          storage.saveToFile();
          logger.info(`Updated custom theme: ${theme.name}`);
        }
      }),

      removeTheme: action((name: string) => {
        const index = themesObservable.findIndex((t) => t.name === name);
        
        if (index !== -1) {
          themesObservable.splice(index, 1);
          storage.saveToFile();
          logger.info(`Removed custom theme: ${name}`);
        }
      }),

      getTheme: (name: string) => themesObservable.find((t) => t.name === name),
    };
  },
});

export default customThemesStorageInjectable;
