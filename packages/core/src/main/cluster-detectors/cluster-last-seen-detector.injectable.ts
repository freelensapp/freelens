/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { ClusterMetadataKey } from "../../common/cluster-types";
import requestClusterVersionInjectable from "./request-cluster-version.injectable";
import { clusterMetadataDetectorInjectionToken } from "./token";

const clusterLastSeenDetectorInjectable = getInjectable({
  id: "cluster-last-seen-detector",
  instantiate: (di) => {
    const requestClusterVersion = di.inject(requestClusterVersionInjectable);

    return {
      key: ClusterMetadataKey.LAST_SEEN,
      detect: async (cluster) => {
        try {
          await requestClusterVersion(cluster);

          return { value: new Date().toJSON(), accuracy: 100 };
        } catch {
          return null;
        }
      },
    };
  },
  injectionToken: clusterMetadataDetectorInjectionToken,
});

export default clusterLastSeenDetectorInjectable;
