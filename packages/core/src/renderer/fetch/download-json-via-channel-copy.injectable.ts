/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging/dist";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { downloadJsonChannel } from "../../common/fetch/download-json-channel";

import type { AsyncResult } from "@freelensapp/utilities/dist";

import type { DownloadJsonOptions } from "../../main/fetch/download-json.injectable";

export type DownloadJsonViaChannel = (url: string, opts?: DownloadJsonOptions) => AsyncResult<unknown, string>;

const downloadJsonViaChannelInjectable: Injectable<DownloadJsonViaChannel, unknown, void> = getInjectable({
  id: "download-json-via-channel",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    return async (url, opts) => {
      return await requestFromChannel(downloadJsonChannel, { url, opts });
    };
  },
  causesSideEffects: true,
});

export default downloadJsonViaChannelInjectable;
