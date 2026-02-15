/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { ChatButton } from "./chat-button";
import { ChatDrawer } from "./chat-drawer";

/**
 * Root component rendered as a cluster frame child.
 * Mounts the floating chat button and the chat drawer.
 */
export const AiChatRoot = () => (
  <>
    <ChatButton />
    <ChatDrawer />
  </>
);
