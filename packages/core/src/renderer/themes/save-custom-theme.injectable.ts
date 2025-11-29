/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

import type { LensTheme } from "./lens-theme";
import type { DiContainer } from "@ogre-tools/injectable";

export type SaveCustomTheme = (theme: LensTheme) => void;

const saveCustomThemeInjectable = getInjectable({
    id: "save-custom-theme",
    instantiate: (di: DiContainer): SaveCustomTheme => {
        const state = di.inject(userPreferencesStateInjectable);

        return (theme) => {
            const customThemes = [...state.customThemes];
            const existingIndex = customThemes.findIndex((t) => t.name === theme.name);

            const themeToSave: LensTheme = {
                ...theme,
                isCustom: true,
                createdAt: theme.createdAt || new Date().toISOString(),
            };

            if (existingIndex >= 0) {
                // Update existing theme
                customThemes[existingIndex] = themeToSave;
            } else {
                // Add new theme
                customThemes.push(themeToSave);
            }

            state.customThemes = customThemes;
        };
    },
});

export default saveCustomThemeInjectable;
