/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Container } from "./container";

/**
 * A single ephemeral container.
 *
 * Ephemeral containers may be run in an existing pod to perform
 * user-initiated actions such as debugging. This list cannot be specified
 * when creating a pod, and it cannot be modified by updating the pod spec. In
 * order to add an ephemeral container to an existing pod, use the pod's
 * ephemeralcontainers subresource.
 *
 * More info:
 * https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
 */
export interface EphemeralContainer extends Container {
  /**
   * If set, the name of the container from PodSpec that this ephemeral
   * container targets. The ephemeral container will be run in the namespaces
   * (IPC, PID, etc) of this container. If not set then the ephemeral
   * container uses the namespaces configured in the Pod spec.
   *
   * The container runtime must implement support for this feature. If the
   * runtime does not support namespace targeting then the result of setting
   * this field is undefined.
   */
  targetContainerName?: string;
}

export type EphemeralContainerWithType = EphemeralContainer & { type: "ephemeralContainers" };
