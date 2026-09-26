/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { EphemeralContainer, Pod } from "@freelensapp/kube-object";

export interface DebugPodReference {
  namespace: string;
  name: string;
  uid: string;
}

export interface DebugContainerReference extends DebugPodReference {
  containerName: string;
}

export interface CreateDebugContainer extends DebugContainerReference {
  image: string;
  targetContainerName: string;
}

export interface DebugContainerPermissions {
  create: boolean;
  exec: boolean;
}

export const defaultDebugImage = "alpine:latest";
export const debugContainerNamePattern = /^freelens-debug-[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/;
export const debugContainerCommand = ["sh", "-c"];
export const debugContainerScript =
  'test -w /tmp || { echo "Debug containers require a writable /tmp" >&2; exit 1; }; ' +
  'while [ ! -f "/tmp/${FREELENS_DEBUG_CONTAINER_NAME}.stop" ]; do sleep 1 || exit; done';

export function buildDebugContainer(request: CreateDebugContainer): EphemeralContainer {
  return {
    name: request.containerName,
    image: request.image,
    targetContainerName: request.targetContainerName,
    command: [...debugContainerCommand],
    args: [debugContainerScript],
    env: [
      { name: "FREELENS_DEBUG_PROTOCOL", value: "1" },
      { name: "FREELENS_DEBUG_CONTAINER_NAME", value: request.containerName },
    ],
    securityContext: { privileged: false, allowPrivilegeEscalation: false },
  };
}

export function isManagedDebugContainer(container: EphemeralContainer): boolean {
  return (
    debugContainerNamePattern.test(container.name) &&
    container.command?.length === 2 &&
    container.command.every((part, index) => part === debugContainerCommand[index]) &&
    container.args?.length === 1 &&
    container.args[0] === debugContainerScript &&
    container.env?.find((env) => env.name === "FREELENS_DEBUG_PROTOCOL")?.value === "1" &&
    container.env?.find((env) => env.name === "FREELENS_DEBUG_CONTAINER_NAME")?.value === container.name
  );
}

export function debugPodReference(pod: Pod): DebugPodReference {
  return { namespace: pod.getNs(), name: pod.getName(), uid: pod.getId() };
}

export function debugUnavailableReason(pod: Pod): string | undefined {
  if (pod.metadata.deletionTimestamp || ["Succeeded", "Failed"].includes(pod.status?.phase ?? "")) {
    return "This pod is terminating or has finished.";
  }
  if (pod.metadata.annotations?.["kubernetes.io/config.mirror"]) {
    return "Static pods do not support ephemeral containers.";
  }
  if (!pod.spec.nodeName) {
    return "The pod must be scheduled on a node before debugging.";
  }
  if (pod.spec.os?.name === "windows" || pod.getSelectedNodeOs() === "windows") {
    return "Debug containers currently support Linux pods only.";
  }
  return undefined;
}

export function debugContainerStopCommand(containerName: string): string[] {
  if (!debugContainerNamePattern.test(containerName)) {
    throw new Error("Invalid debug container name");
  }
  // The file is unique to this container, including when IPC or PID namespaces are shared.
  return ["sh", "-c", ': > "$1"', "--", `/tmp/${containerName}.stop`];
}
