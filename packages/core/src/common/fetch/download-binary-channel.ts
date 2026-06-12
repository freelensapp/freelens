/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

import type { Result } from "@freelensapp/utilities";

import type { DownloadBinaryOptions } from "../../main/fetch/download-binary.injectable";

export const downloadBinaryChannel = getRequestChannel<
  { url: string; opts: DownloadBinaryOptions },
  Result<Buffer, string>
>("download-binary-channel");
