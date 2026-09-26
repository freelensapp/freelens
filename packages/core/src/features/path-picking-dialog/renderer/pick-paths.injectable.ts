/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { openPathPickingDialogChannel } from "../common/channel";

import type { PathPickOpts } from "../../../renderer/components/path-picker";

export type OpenPathPickingDialog = (options: PathPickOpts) => Promise<void>;

const openPathPickingDialogInjectable = getInjectable({
  id: "open-path-picking-dialog",
  instantiate: (di): OpenPathPickingDialog => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    let isDialogOpen = false;

    return async (options) => {
      if (isDialogOpen) {
        return;
      }

      const { onPick, onCancel, ...dialogOptions } = options;

      isDialogOpen = true;

      // Release the guard as soon as the native dialog closes, so that a long
      // running onPick (e.g. installing an extension) does not block every
      // other path picking dialog of the application in the meantime.
      const response = await requestFromChannel(openPathPickingDialogChannel, dialogOptions).finally(() => {
        isDialogOpen = false;
      });

      if (response.canceled) {
        await onCancel?.();
      } else {
        await onPick?.(response.paths);
      }
    };
  },
});

export default openPathPickingDialogInjectable;
