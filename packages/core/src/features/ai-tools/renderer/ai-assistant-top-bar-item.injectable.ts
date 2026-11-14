/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { topBarItemOnRightSideInjectionToken } from "../../../renderer/components/layout/top-bar/top-bar-items/top-bar-item-injection-token";
import { AiAssistantTopBarItem } from "./ai-assistant-top-bar-item";

const aiAssistantTopBarItemInjectable = getInjectable({
  id: "ai-assistant-top-bar-item",
  instantiate: () => ({
    id: "ai-assistant",
    isShown: computed(() => true),
    orderNumber: 100,
    Component: AiAssistantTopBarItem,
  }),
  injectionToken: topBarItemOnRightSideInjectionToken,
});

export default aiAssistantTopBarItemInjectable;
