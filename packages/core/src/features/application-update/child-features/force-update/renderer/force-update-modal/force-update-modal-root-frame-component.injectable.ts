/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rootFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import updateDownloadedDateTimeInjectable from "../../../../common/update-downloaded-date-time.injectable";
import { ForceUpdateModal } from "./force-update-modal";
import timeAfterUpdateMustBeInstalledInjectable from "./time-after-update-must-be-installed.injectable";
import timeSinceUpdateWasDownloadedInjectable from "./time-since-update-was-downloaded.injectable";

const forceUpdateModalRootFrameComponentInjectable = getInjectable({
  id: "force-update-modal-root-frame-component",

  instantiate: (di) => {
    const timeSinceUpdateWasDownloaded = di.inject(timeSinceUpdateWasDownloadedInjectable);
    const updateDownloadedDateTime = di.inject(updateDownloadedDateTimeInjectable);
    const timeWhenUpdateMustBeInstalled = di.inject(timeAfterUpdateMustBeInstalledInjectable);

    return {
      id: "force-update-modal",
      Component: ForceUpdateModal,

      shouldRender: computed(
        () =>
          !!updateDownloadedDateTime.value.get() && timeSinceUpdateWasDownloaded.get() >= timeWhenUpdateMustBeInstalled,
      ),
    };
  },

  injectionToken: rootFrameChildComponentInjectionToken,

  // Note: Globally overridden because it observes the current time which can cause long running tests
  causesSideEffects: true,
});

export default forceUpdateModalRootFrameComponentInjectable;
