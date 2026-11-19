/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * How a pod terminal reaches its container:
 *
 * - `exec` starts a shell of its own in the container, which the session ends
 *   when the tab closes;
 * - `attach` connects to the container's main process, which closing the tab
 *   only detaches from.
 */
export type PodTerminalMode = "exec" | "attach";

/**
 * The container a pod terminal tab opens, kept with the tab so that it opens
 * the same container again after a reload or a restart.
 */
export interface PodTerminalTarget {
  readonly mode: PodTerminalMode;
  readonly namespace: string;
  readonly pod: string;
  /**
   * Absent to leave the choice to kubectl, which takes the default container
   * of the pod.
   */
  readonly container?: string;
  /**
   * Whether the pod runs on a Windows node, where the shell is PowerShell.
   */
  readonly windows?: boolean;
}

const queryTypes: Record<PodTerminalMode, string> = {
  exec: "pod-exec",
  attach: "pod-attach",
};

/**
 * The query parameters of the terminal websocket that open {@link target}.
 */
export const podTerminalQuery = (target: PodTerminalTarget): Record<string, string | undefined> => ({
  type: queryTypes[target.mode],
  namespace: target.namespace,
  pod: target.pod,
  container: target.container || undefined,
  os: target.windows ? "windows" : undefined,
});

/**
 * The target a terminal websocket asks for, or `undefined` when it is no pod
 * terminal. The values are not checked here: see {@link podTerminalTargetError}.
 */
export const parsePodTerminalQuery = (searchParams: URLSearchParams): PodTerminalTarget | undefined => {
  const type = searchParams.get("type");
  const mode = (Object.keys(queryTypes) as PodTerminalMode[]).find((key) => queryTypes[key] === type);

  if (!mode) {
    return undefined;
  }

  return {
    mode,
    namespace: searchParams.get("namespace") ?? "",
    pod: searchParams.get("pod") ?? "",
    container: searchParams.get("container") || undefined,
    windows: searchParams.get("os") === "windows",
  };
};

// RFC 1123 names, as Kubernetes validates them. Neither can start with `-`, so
// a value that passes cannot be read as an option of kubectl.
const dnsLabel = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;
const dnsSubdomain = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

/**
 * Why {@link target} cannot be opened, or `undefined` when it can. The values
 * become arguments of kubectl, so anything that is not a name Kubernetes
 * accepts is refused.
 */
export const podTerminalTargetError = (target: PodTerminalTarget): string | undefined => {
  if (!dnsLabel.test(target.namespace)) {
    return `invalid namespace name "${target.namespace}"`;
  }

  if (target.pod.length > 253 || !dnsSubdomain.test(target.pod)) {
    return `invalid pod name "${target.pod}"`;
  }

  if (target.container !== undefined && !dnsLabel.test(target.container)) {
    return `invalid container name "${target.container}"`;
  }

  return undefined;
};
