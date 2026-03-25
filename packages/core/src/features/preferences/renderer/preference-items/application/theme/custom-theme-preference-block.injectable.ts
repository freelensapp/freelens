/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { CustomThemeEditor } from "./custom-theme-editor";

const customThemePreferenceBlockInjectable = getInjectable({
  id: "custom-theme-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "custom-theme",
    parentId: "application-page",
    orderNumber: 11, // After theme selector
    Component: CustomThemeEditor,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default customThemePreferenceBlockInjectable;
