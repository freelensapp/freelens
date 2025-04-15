/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { iter } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import clusterFramesInjectable from "../../../common/cluster-frames.injectable";
import { IpcRendererNavigationEvents } from "../../../common/ipc/navigation-events";
import getCurrentApplicationWindowInjectable from "./application-window/get-current-application-window.injectable";
import showApplicationWindowInjectable from "./show-application-window.injectable";

const navigateInjectable = getInjectable({
  id: "navigate",

  instantiate: (di) => {
    const getApplicationWindow = di.inject(getCurrentApplicationWindowInjectable);
    const showApplicationWindow = di.inject(showApplicationWindowInjectable);
    const clusterFrames = di.inject(clusterFramesInjectable);

    return async (url: string, frameId?: number) => {
      await showApplicationWindow();

      const applicationWindow = getApplicationWindow();

      assert(applicationWindow);

      const frameInfo = iter.find(clusterFrames.values(), (frameInfo) => frameInfo.frameId === frameId);

      const channel = frameInfo
        ? IpcRendererNavigationEvents.NAVIGATE_IN_CLUSTER
        : IpcRendererNavigationEvents.NAVIGATE_IN_APP;

      applicationWindow.send({
        channel,
        frameInfo,
        data: url,
      });
    };
  },
});

export default navigateInjectable;
