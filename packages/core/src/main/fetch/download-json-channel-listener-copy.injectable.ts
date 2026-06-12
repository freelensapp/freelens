/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { downloadJsonChannel } from "../../common/fetch/download-json-channel";
import downloadJsonInjectable from "./download-json.injectable";

const nodeFetchChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "download-json-channel-listener",
  channel: downloadJsonChannel,
  getHandler: (di) => {
    const downloadJson = di.inject(downloadJsonInjectable);
    return async ({ url, opts }) => {
      return await downloadJson(url, opts);
    };
  },
});

export default nodeFetchChannelListenerInjectable;
