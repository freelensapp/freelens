/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { downloadBinaryChannel } from "../../common/fetch/download-binary-channel";
import downloadBinaryInjectable from "./download-binary.injectable";

const nodeFetchChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "download-binary-channel-listener",
  channel: downloadBinaryChannel,
  getHandler: (di) => {
    const downloadBinary = di.inject(downloadBinaryInjectable);
    return async ({ url, opts }) => {
      return await downloadBinary(url, opts);
    };
  },
});

export default nodeFetchChannelListenerInjectable;
