/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import askUserForFilePathsInjectable from "../../../main/ipc/ask-user-for-file-paths.injectable";
import { openPathPickingDialogChannel } from "../common/channel";

const openPathPickingDialogListener = getRequestChannelListenerInjectable({
  id: "open-path-picking-dialog",
  channel: openPathPickingDialogChannel,
  getHandler: (di) => di.inject(askUserForFilePathsInjectable),
});

export default openPathPickingDialogListener;
