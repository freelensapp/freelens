/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

export type ExtensionCredentialsRequest =
  | { operation: "isAvailable" }
  | { operation: "get"; extensionId: string; key: string }
  | { operation: "set"; extensionId: string; key: string; value: string }
  | { operation: "delete"; extensionId: string; key: string }
  | { operation: "keys"; extensionId: string }
  | { operation: "remove"; extensionId: string };

/**
 * The outcome of a request. A rejection is sent as data rather than thrown,
 * so that the renderer gets the main process's message as it is, without the
 * wrapping Electron adds to an error thrown in a handler.
 */
export type ExtensionCredentialsResponse =
  | { status: "fulfilled"; value?: boolean | string | string[] }
  | { status: "rejected"; name: string; message: string };

export const extensionCredentialsChannel = getRequestChannel<ExtensionCredentialsRequest, ExtensionCredentialsResponse>(
  "extension-credentials",
);
