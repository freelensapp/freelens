import type { MessageChannel } from "@freelensapp/messaging";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { IpcRendererNavigationEvents } from "../ipc/navigation-events";

export type AppNavigationChannel = MessageChannel<string>;

export const appNavigationChannel: AppNavigationChannel = {
  id: IpcRendererNavigationEvents.NAVIGATE_IN_APP,
};
