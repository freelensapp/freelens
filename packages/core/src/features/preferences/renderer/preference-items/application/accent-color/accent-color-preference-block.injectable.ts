/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { AccentColor } from "./accent-color";

const accentColorPreferenceBlockInjectable = getInjectable({
    id: "accent-color-preference-item",

    instantiate: () => ({
        kind: "block" as const,
        id: "accent-color",
        parentId: "application-page",
        orderNumber: 11,
        Component: AccentColor,
    }),

    injectionToken: preferenceItemInjectionToken,
});

export default accentColorPreferenceBlockInjectable;
