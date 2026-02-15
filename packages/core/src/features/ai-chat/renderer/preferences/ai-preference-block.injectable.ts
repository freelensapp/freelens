/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../preferences/renderer/preference-items/preference-item-injection-token";
import { AiPreferenceBlock } from "./ai-preference-block";

const aiPreferenceBlockInjectable = getInjectable({
  id: "ai-preference-block",

  instantiate: () => ({
    kind: "block" as const,
    id: "ai-preference-block",
    parentId: "ai-page",
    orderNumber: 10,
    Component: AiPreferenceBlock,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default aiPreferenceBlockInjectable;
