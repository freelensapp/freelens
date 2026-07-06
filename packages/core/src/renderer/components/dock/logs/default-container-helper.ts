/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Container, EphemeralContainer, Pod } from "@freelensapp/kube-object";

export function findOptimalDefaultContainerOfPod(pod: Pod): Container | EphemeralContainer {
  return findOptimalDefaultContainer(pod.getAllContainers(), pod.getAnnotations(true));
}

export function findOptimalDefaultContainer(
  containers: (Container | EphemeralContainer)[],
  annotations: string[],
): Container | EphemeralContainer {
  const defaultContainerAnnotation = "kubectl.kubernetes.io/default-container=";
  const defaultContainer = annotations
    .find((s) => s.startsWith(defaultContainerAnnotation))
    ?.substring(defaultContainerAnnotation.length);

  if (defaultContainer) {
    const container = containers.find((container) => container.name == defaultContainer);
    if (container) {
      return container;
    }
  }
  return containers[0];
}
