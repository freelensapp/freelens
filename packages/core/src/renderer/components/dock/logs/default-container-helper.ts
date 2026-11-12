/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Container, EphemeralContainer, Pod } from "@freelensapp/kube-object";

/**
 * The annotation that names the container kubectl picks when `-c` is omitted.
 */
export const defaultContainerAnnotation = "kubectl.kubernetes.io/default-container";

/**
 * Resolves the container kubectl would pick from `containers` when `-c` is omitted: the one
 * named by the `kubectl.kubernetes.io/default-container` annotation when it is in the list,
 * otherwise the first one. Returns `undefined` only when `containers` is empty.
 *
 * Both choosing a container and marking it as the default go through this function, so the
 * two cannot disagree.
 */
export function findOptimalDefaultContainer<C extends { name: string }>(
  containers: readonly C[],
  annotations: Partial<Record<string, string>> | undefined,
): C | undefined {
  const defaultContainerName = annotations?.[defaultContainerAnnotation];

  if (defaultContainerName) {
    const container = containers.find((container) => container.name === defaultContainerName);

    if (container) {
      return container;
    }
  }

  return containers[0];
}

/**
 * Resolves the default container among all the containers of `pod`.
 */
export function findOptimalDefaultContainerOfPod(pod: Pod): Container | EphemeralContainer | undefined {
  return findOptimalDefaultContainer(pod.getAllContainers(), pod.metadata.annotations);
}
