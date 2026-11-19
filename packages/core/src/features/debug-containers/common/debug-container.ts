/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Pod } from "@freelensapp/kube-object";

/**
 * The profiles of `kubectl debug --profile`. Leaving the profile out lets kubectl pick its own
 * default, which changed between versions, so that an older kubectl does not fail on it.
 */
export const debugProfiles = ["general", "baseline", "restricted", "netadmin", "sysadmin", "legacy"] as const;

export type DebugProfile = (typeof debugProfiles)[number];

/**
 * What a debug terminal tab keeps, so that a tab restored or reconnected later attaches to the
 * container it created rather than creating another one, which a pod can never remove.
 */
export interface DebugContainerSpec {
  namespace: string;
  pod: string;
  podUid: string;
  container: string;
  image: string;
  target: string;
  profile?: DebugProfile;
  env?: string[];
  custom?: string;
}

/**
 * A container name, which is a DNS label. The dialog names its containers `freelens-debug-…`, but
 * a tab also attaches to an ephemeral container added by other means.
 */
export const containerNamePattern = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;
export const kubernetesNamePattern = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;
export const debugImagePattern = /^[^\s-]\S*$/;
export const debugEnvPattern = /^[-._a-zA-Z][-._a-zA-Z0-9]*=/;
export const maxDebugCustomSpecLength = 64 * 1024;

export function debugContainerSpecError(spec: Partial<DebugContainerSpec>): string | undefined {
  if (!spec.namespace || !kubernetesNamePattern.test(spec.namespace)) return "Invalid namespace.";
  if (!spec.pod || !kubernetesNamePattern.test(spec.pod)) return "Invalid pod name.";
  if (!spec.podUid) return "Missing pod UID.";
  if (!spec.container || !containerNamePattern.test(spec.container)) return "Invalid debug container name.";
  if (!spec.image || spec.image.length > 1024 || !debugImagePattern.test(spec.image)) {
    return "Enter an image reference without spaces.";
  }
  if (!spec.target || !containerNamePattern.test(spec.target)) return "Select a target container.";
  if (spec.profile && !debugProfiles.includes(spec.profile)) return "Invalid profile.";

  const invalidEnv = spec.env?.find((env) => !debugEnvPattern.test(env));

  if (invalidEnv !== undefined) return `Invalid environment variable: ${invalidEnv}`;
  if (spec.custom && spec.custom.length > maxDebugCustomSpecLength) return "The custom container spec is too long.";

  return undefined;
}

export function debugUnavailableReason(pod: Pod): string | undefined {
  if (pod.metadata.deletionTimestamp || ["Succeeded", "Failed"].includes(pod.status?.phase ?? "")) {
    return "This pod is terminating or has finished.";
  }
  if (pod.metadata.annotations?.["kubernetes.io/config.mirror"]) {
    return "Static pods do not support ephemeral containers.";
  }
  if (!pod.spec?.nodeName) {
    return "The pod must be scheduled on a node before debugging.";
  }
  if (pod.spec.os?.name === "windows" || pod.getSelectedNodeOs() === "windows") {
    return "Debug containers currently support Linux pods only.";
  }
  return undefined;
}

/**
 * The arguments of kubectl, after `--kubeconfig`, that add the debug container to the pod without
 * attaching to it. It gets a terminal and an open stdin, which the session attaches to.
 */
export function debugContainerCreateArgs(spec: DebugContainerSpec, customFile?: string): string[] {
  return [
    "debug",
    "--namespace",
    spec.namespace,
    spec.pod,
    `--container=${spec.container}`,
    `--image=${spec.image}`,
    `--target=${spec.target}`,
    ...(spec.profile ? [`--profile=${spec.profile}`] : []),
    ...(spec.env ?? []).map((env) => `--env=${env}`),
    ...(customFile ? [`--custom=${customFile}`] : []),
    "--stdin",
    "--tty",
    "--attach=false",
    "--quiet",
  ];
}

export function debugContainerAttachArgs(spec: DebugContainerSpec): string[] {
  return ["attach", "--namespace", spec.namespace, spec.pod, `--container=${spec.container}`, "--stdin", "--tty"];
}

/**
 * The query of the terminal's websocket that carries a debug container to its shell session.
 */
export function debugContainerQuery(spec: DebugContainerSpec): Record<string, string | string[]> {
  return {
    type: "debug-container",
    namespace: spec.namespace,
    pod: spec.pod,
    podUid: spec.podUid,
    container: spec.container,
    image: spec.image,
    target: spec.target,
    ...(spec.profile ? { profile: spec.profile } : {}),
    ...(spec.env?.length ? { env: spec.env } : {}),
    ...(spec.custom ? { custom: spec.custom } : {}),
  };
}

export function parseDebugContainerQuery(params: URLSearchParams): DebugContainerSpec | undefined {
  if (params.get("type") !== "debug-container") return undefined;

  return {
    namespace: params.get("namespace") ?? "",
    pod: params.get("pod") ?? "",
    podUid: params.get("podUid") ?? "",
    container: params.get("container") ?? "",
    image: params.get("image") ?? "",
    target: params.get("target") ?? "",
    profile: (params.get("profile") || undefined) as DebugProfile | undefined,
    env: params.getAll("env"),
    custom: params.get("custom") || undefined,
  };
}

/**
 * Stops a debug container, run by `kubectl exec` inside it, as best effort: Kubernetes has no API
 * to stop an ephemeral container. With `--target` the container shares the PID namespace of its
 * target, where PID 1 is the target's process, so its own main process is found as the oldest
 * process in its mount namespace. An interactive shell ignores SIGTERM, but not SIGHUP. Needs `sh`,
 * `readlink` and `kill` in the image.
 */
export const debugContainerStopScript = [
  "self=$(readlink /proc/self/ns/mnt); main=",
  "for p in /proc/[0-9]*; do p=${p#/proc/}",
  '  [ "$p" != "$$" ] && [ "$(readlink "/proc/$p/ns/mnt" 2>/dev/null)" = "$self" ] && { [ -z "$main" ] || [ "$p" -lt "$main" ]; } && main=$p',
  "done",
  '[ -n "$main" ] || { echo "Cannot find the main process of the container" >&2; exit 1; }',
  // In the background, as the runtime kills this command too once the container stops.
  '{ kill -HUP "$main"; sleep 2; if kill -0 "$main"; then kill -KILL "$main"; fi; } </dev/null >/dev/null 2>&1 &',
  "exit 0",
].join("\n");

export interface DebugContainerReference {
  namespace: string;
  pod: string;
  container: string;
}

export function debugContainerReferenceError(reference: Partial<DebugContainerReference>): string | undefined {
  if (!reference.namespace || !kubernetesNamePattern.test(reference.namespace)) return "Invalid namespace.";
  if (!reference.pod || !kubernetesNamePattern.test(reference.pod)) return "Invalid pod name.";
  if (!reference.container || !containerNamePattern.test(reference.container)) return "Invalid container name.";

  return undefined;
}
