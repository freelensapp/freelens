/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isEqual } from "es-toolkit";
import {
  buildDebugContainer,
  debugContainerStopCommand,
  debugUnavailableReason,
  isManagedDebugContainer,
} from "../common/debug-container";

import type { NodeApi, PodApi } from "@freelensapp/kube-api";

import type { CanI } from "../../../common/cluster/create-can-i.injectable";
import type {
  CreateDebugContainer,
  DebugContainerPermissions,
  DebugContainerReference,
  DebugPodReference,
} from "../common/debug-container";

export interface DebugContainersDependencies {
  podApi: Pick<PodApi, "get" | "addEphemeralContainer">;
  nodeApi: Pick<NodeApi, "get">;
  canI: CanI;
  execInPod: (reference: DebugContainerReference, command: string[]) => Promise<void>;
}

export class DebugContainers {
  constructor(private readonly dependencies: DebugContainersDependencies) {}

  async permissions(namespace: string): Promise<DebugContainerPermissions> {
    const attributes = { group: "", resource: "pods", namespace };
    const [create, exec] = await Promise.all([
      this.dependencies.canI({ ...attributes, subresource: "ephemeralcontainers", verb: "patch" }),
      this.dependencies.canI({ ...attributes, subresource: "exec", verb: "create" }),
    ]);

    return { create, exec };
  }

  async getPod(reference: DebugPodReference) {
    const pod = await this.dependencies.podApi.get({ name: reference.name, namespace: reference.namespace });

    if (!pod || pod.getId() !== reference.uid) {
      throw new Error("The pod was deleted or replaced. Reopen its details before debugging.");
    }
    return pod;
  }

  async create(request: CreateDebugContainer): Promise<void> {
    const permissions = await this.permissions(request.namespace);

    if (!permissions.create || !permissions.exec) {
      throw new Error(
        "Debugging requires patch permission on pods/ephemeralcontainers and create permission on pods/exec.",
      );
    }
    const container = buildDebugContainer(request);

    for (let attempt = 0; attempt < 3; attempt++) {
      const pod = await this.getPod(request);
      const reason = debugUnavailableReason(pod);

      if (reason) throw new Error(reason);
      const operatingSystem =
        pod.spec.os?.name ?? (await this.dependencies.nodeApi.get({ name: pod.spec.nodeName! }))?.getOperatingSystem();

      if (operatingSystem !== "linux") {
        throw new Error(
          "Cannot confirm that this pod runs on Linux. Debug containers currently support Linux pods only.",
        );
      }
      if (!pod.getContainers().some((candidate) => candidate.name === request.targetContainerName)) {
        throw new Error("The selected target container no longer exists.");
      }
      const existing = pod.getAllContainers().find((candidate) => candidate.name === container.name);
      const ephemeral = pod.spec.ephemeralContainers?.find((candidate) => candidate.name === container.name);

      if (existing) {
        // A retried request must never create a second debugger or modify an existing one.
        if (
          ephemeral &&
          isManagedDebugContainer(ephemeral) &&
          ephemeral.image === container.image &&
          ephemeral.targetContainerName === container.targetContainerName &&
          isEqual(ephemeral.securityContext, container.securityContext)
        )
          return;
        throw new Error("This container name is already in use. Reopen the dialog to create a new debugger.");
      }
      try {
        await this.dependencies.podApi.addEphemeralContainer(
          { ...request, resourceVersion: pod.getResourceVersion() },
          container,
        );
        return;
      } catch (error) {
        if (attempt === 2 || (error as { code?: number })?.code !== 409) throw error;
      }
    }
  }

  async getManagedContainer(reference: DebugContainerReference) {
    const pod = await this.getPod(reference);
    const container = pod.spec.ephemeralContainers?.find((candidate) => candidate.name === reference.containerName);

    if (!container || !isManagedDebugContainer(container)) {
      throw new Error("This container does not use Freelens' supported debug lifecycle.");
    }
    const status = pod.status?.ephemeralContainerStatuses?.find((candidate) => candidate.name === container.name);

    return { pod, status };
  }

  async stop(reference: DebugContainerReference): Promise<void> {
    const { status } = await this.getManagedContainer(reference);

    if (status?.state?.terminated) return;
    if (!status?.state?.running) throw new Error("The debug container is not running yet.");
    const { exec } = await this.permissions(reference.namespace);

    if (!exec) throw new Error("Stopping a debugger requires create permission on pods/exec.");
    await this.dependencies.execInPod(reference, debugContainerStopCommand(reference.containerName));
  }
}
