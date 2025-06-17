/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import clusterFramesInjectable from "../../../common/cluster-frames.injectable";
import type { NavigateForExtensionArgs } from "../../../features/extensions/navigate/common/channel";
import { navigateForExtensionChannel } from "../../../features/extensions/navigate/common/channel";
import getCurrentApplicationWindowInjectable from "./application-window/get-current-application-window.injectable";
import showApplicationWindowInjectable from "./show-application-window.injectable";

export type NavigateForExtension = (
  extId: string,
  pageId?: string,
  params?: Record<string, any>,
  frameId?: number,
) => Promise<void>;

const navigateForExtensionInjectable = getInjectable({
  id: "navigate-for-extension",

  instantiate: (di): NavigateForExtension => {
    const getApplicationWindow = di.inject(getCurrentApplicationWindowInjectable);
    const clusterFrames = di.inject(clusterFramesInjectable);
    const showApplicationWindow = di.inject(showApplicationWindowInjectable);

    return async (extId: string, pageId?: string, params?: Record<string, any>, frameId?: number) => {
      await showApplicationWindow();

      const applicationWindow = getApplicationWindow();

      assert(applicationWindow);

      const frameInfo = iter.find(clusterFrames.values(), (frameInfo) => frameInfo.frameId === frameId);

      applicationWindow.send({
        channel: navigateForExtensionChannel.id,
        frameInfo,
        data: { extId, pageId, params } as NavigateForExtensionArgs,
      });
    };
  },
});

export default navigateForExtensionInjectable;
