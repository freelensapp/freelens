/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { ReleaseDetails } from "./release-details";
import targetHelmReleaseInjectable from "./target-helm-release.injectable";

const releaseDetailsClusterFrameChildComponentInjectable = getInjectable({
  id: "release-details-cluster-frame-child-component",

  instantiate: (di) => {
    const targetRelease = di.inject(targetHelmReleaseInjectable);

    return {
      id: "release-details",
      Component: ReleaseDetails,
      shouldRender: computed(() => !!targetRelease.get()),
    };
  },
  injectionToken: clusterFrameChildComponentInjectionToken,
});

export default releaseDetailsClusterFrameChildComponentInjectable;
