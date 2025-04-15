/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { reactApplicationChildrenInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";

const frameApplicationRootInjectable = getInjectable({
  id: "frame-application-root",

  instantiate: () => {
    const Frame = process.isMainFrame
      ? require("./root-frame/root-frame").RootFrame
      : require("./cluster-frame/cluster-frame").ClusterFrame;

    return {
      id: "frame-application-root",
      Component: Frame,
      enabled: computed(() => true),
    };
  },

  causesSideEffects: true,

  injectionToken: reactApplicationChildrenInjectionToken,
});

export default frameApplicationRootInjectable;
