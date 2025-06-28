/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging/dist";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { downloadBinaryChannel } from "../../common/fetch/download-binary-channel";

import type { AsyncResult } from "@freelensapp/utilities/dist";

import type { DownloadBinaryOptions } from "../../main/fetch/download-binary.injectable";

export type DownloadBinaryViaChannel = (url: string, opts?: DownloadBinaryOptions) => AsyncResult<Buffer, string>;

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
