/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { defaultThemeId } from "../../common/vars";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

export type DeleteCustomTheme = (themeName: string) => void;

const deleteCustomThemeInjectable = getInjectable({
    id: "delete-custom-theme",
    instantiate: (di): DeleteCustomTheme => {
        const state = di.inject(userPreferencesStateInjectable);

        return (themeName) => {
            const customThemes = state.customThemes.filter((theme) => theme.name !== themeName);

            state.customThemes = customThemes;

            // If the deleted theme was active, reset to default
            if (state.colorTheme === themeName) {
                state.colorTheme = defaultThemeId;
            }
        };
    },
});

export default deleteCustomThemeInjectable;
