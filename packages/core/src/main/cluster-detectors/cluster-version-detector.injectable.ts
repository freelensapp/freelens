/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { ClusterMetadataKey } from "../../common/cluster-types";
import requestClusterVersionInjectable from "./request-cluster-version.injectable";
import { clusterMetadataDetectorInjectionToken } from "./token";

const clusterVersionDetectorInjectable = getInjectable({
  id: "cluster-version-detector",
  instantiate: (di) => {
    const requestClusterVersion = di.inject(requestClusterVersionInjectable);

    return {
      key: ClusterMetadataKey.VERSION,
      detect: async (cluster) => ({
        value: await requestClusterVersion(cluster),
        accuracy: 100,
      }),
    };
  },
  injectionToken: clusterMetadataDetectorInjectionToken,
});

export default clusterVersionDetectorInjectable;
