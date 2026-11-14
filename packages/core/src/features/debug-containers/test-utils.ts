/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";

import type { ContainerState } from "@freelensapp/kube-object";

export const debugRequest = {
  namespace: "default",
  name: "app",
  uid: "pod-uid",
  containerName: "freelens-debug-123",
  image: "alpine:latest",
  targetContainerName: "app",
};

export function debugTestPod(state?: ContainerState, metadata: Partial<Pod["metadata"]> = {}): Pod {
  return new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      uid: "pod-uid",
      name: "app",
      namespace: "default",
      resourceVersion: "1",
      selfLink: "/api/v1/namespaces/default/pods/app",
      ...metadata,
    },
    spec: { nodeName: "node", os: { name: "linux" }, containers: [{ name: "app", image: "app" }] },
    status: {
      phase: "Running",
      conditions: [],
      podIP: "10.0.0.1",
      startTime: "2026-01-01T00:00:00Z",
      ephemeralContainerStatuses: state
        ? [
            {
              name: debugRequest.containerName,
              state,
              ready: false,
              restartCount: 0,
              image: "alpine",
              imageID: "image-id",
            },
          ]
        : [],
    },
  });
}
