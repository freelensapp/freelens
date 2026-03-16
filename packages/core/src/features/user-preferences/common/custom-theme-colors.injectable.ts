/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { userPreferenceDescriptorInjectionToken } from "./token";

export interface CustomThemeColors {
  primary?: string;
  mainBackground?: string;
  sidebarBackground?: string;
  textColorPrimary?: string;
  [key: string]: string | undefined;
}

export interface CustomThemePreference {
  customThemeColors: CustomThemeColors;
  customThemeBase: "dark" | "light";
}

const customThemeColorsPreferenceDescriptorInjectable = getInjectable({
  id: "custom-theme-colors-preference-descriptor",

  instantiate: () => ({
    id: "customThemeColors",
    defaultValue: {},
    migrations: [
      {
        version: 1,
        migrate: (value: unknown) => ({
          customThemeColors: value as CustomThemeColors || {},
          customThemeBase: "dark" as const,
        }),
      },
    ],
  }),

  injectionToken: userPreferenceDescriptorInjectionToken,
});

const customThemeBasePreferenceDescriptorInjectable = getInjectable({
  id: "custom-theme-base-preference-descriptor",

  instantiate: () => ({
    id: "customThemeBase",
    defaultValue: "dark" as const,
  }),

  injectionToken: userPreferenceDescriptorInjectionToken,
});

export default customThemeColorsPreferenceDescriptorInjectable;
export { customThemeBasePreferenceDescriptorInjectable };
