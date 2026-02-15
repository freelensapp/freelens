/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { AiChatRoot } from "./ai-chat-root";

const aiChatClusterFrameChildComponentInjectable = getInjectable({
  id: "ai-chat-cluster-frame-child-component",

  instantiate: () => ({
    id: "ai-chat",
    shouldRender: computed(() => true),
    Component: AiChatRoot,
  }),

  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default aiChatClusterFrameChildComponentInjectable;
