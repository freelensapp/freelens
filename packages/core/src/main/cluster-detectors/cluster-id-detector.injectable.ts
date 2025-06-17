/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { createHash } from "crypto";
import { ClusterMetadataKey } from "../../common/cluster-types";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import k8SRequestInjectable from "../k8s-request.injectable";
import { clusterMetadataDetectorInjectionToken } from "./token";

import type { Cluster } from "../../common/cluster/cluster";

const clusterIdDetectorFactoryInjectable = getInjectable({
  id: "cluster-id-detector-factory",
  instantiate: (di) => {
    const k8sRequest = di.inject(k8SRequestInjectable);
    const getDefaultNamespaceId = async (cluster: Cluster) => {
      const { metadata } = (await k8sRequest(cluster, "/api/v1/namespaces/default")) as { metadata: { uid: string } };

      return metadata.uid;
    };

    return {
      key: ClusterMetadataKey.CLUSTER_ID,
      detect: async (cluster) => {
        let id: string;

        try {
          id = await getDefaultNamespaceId(cluster);
        } catch (_) {
          id = (await di.inject(clusterApiUrlInjectable, cluster)()).toString();
        }
        const value = createHash("sha256").update(id).digest("hex");

        return { value, accuracy: 100 };
      },
    };
  },
  injectionToken: clusterMetadataDetectorInjectionToken,
});

export default clusterIdDetectorFactoryInjectable;
