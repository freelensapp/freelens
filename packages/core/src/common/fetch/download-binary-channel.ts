/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { Result } from "@freelensapp/utilities";

import type { DownloadBinaryOptions } from "../../main/fetch/download-binary.injectable";

/**
 * The response is a `Uint8Array` rather than the `Buffer` main sends, because
 * that is what arrives: the structured clone of the IPC does not keep the
 * `Buffer` prototype.
 */
export const downloadBinaryChannel = getRequestChannel<
  { url: string; opts: DownloadBinaryOptions },
  Result<Uint8Array, string>
>("download-binary-channel");
