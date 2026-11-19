/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { downloadBinaryChannel } from "../../common/fetch/download-binary-channel";

import type { AsyncResult } from "@freelensapp/utilities";

import type { DownloadBinaryOptions } from "../../main/fetch/download-binary.injectable";

/**
 * Download over main's network stack.
 *
 * Main answers with a `Buffer`, but the structured clone of the IPC delivers a
 * plain `Uint8Array`: `toString("utf-8")` on it joins the bytes with commas
 * rather than decoding them. Decode text with a `TextDecoder`.
 */
export type DownloadBinaryViaChannel = (url: string, opts?: DownloadBinaryOptions) => AsyncResult<Uint8Array, string>;

const downloadBinaryViaChannelInjectable: Injectable<DownloadBinaryViaChannel, unknown, void> = getInjectable({
  id: "download-binary-via-channel",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    return async (url, opts) => {
      return await requestFromChannel(downloadBinaryChannel, { url, opts });
    };
  },
});

export default downloadBinaryViaChannelInjectable;
