/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * What an AI assistant session may do with the Kubernetes API through
 * ProLens. Reads pass; anything that changes the cluster, opens an
 * interactive channel into it, or reveals Secret values needs the user's
 * approval of that exact request.
 */
export type KubeRequestDecision =
  | { kind: "read" }
  | {
      kind: "approval";
      reason: "mutation" | "interactive" | "secret";
      /** e.g. "delete pods web-1 in namespace shop". */
      action: string;
    };

export interface KubeRequestTarget {
  /** Resource, e.g. "pods" or "deployments.apps"; undefined for a non-resource path. */
  resource?: string;
  name?: string;
  namespace?: string;
  subresource?: string;
}

const readMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const interactiveSubresources = new Set(["exec", "attach", "portforward", "proxy"]);

/**
 * Review resources a client creates to ask a question, not to change state:
 * `kubectl auth can-i` posts a SelfSubjectAccessReview.
 */
const questionResources = new Set([
  "selfsubjectaccessreviews.authorization.k8s.io",
  "selfsubjectrulesreviews.authorization.k8s.io",
  "selfsubjectreviews.authentication.k8s.io",
]);

/**
 * Splits a Kubernetes API path into what it addresses:
 * `/api/v1/namespaces/shop/pods/web-1/log` → pods web-1 in shop, subresource log.
 */
export const parseKubeApiPath = (pathname: string): KubeRequestTarget => {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  let rest: string[];
  let group = "";

  if (parts[0] === "api" && parts.length >= 2) {
    rest = parts.slice(2);
  } else if (parts[0] === "apis" && parts.length >= 3) {
    group = parts[1];
    rest = parts.slice(3);
  } else {
    return {};
  }

  let namespace: string | undefined;

  if (rest[0] === "namespaces" && rest.length >= 3) {
    namespace = rest[1];
    rest = rest.slice(2);
  }

  if (!rest[0]) {
    return {};
  }

  return {
    resource: group ? `${rest[0]}.${group}` : rest[0],
    name: rest[1],
    namespace,
    subresource: rest[2],
  };
};

const verbFor = (method: string, hasName: boolean) => {
  switch (method) {
    case "POST":
      return "create";
    case "PUT":
      return "replace";
    case "PATCH":
      return "patch";
    case "DELETE":
      return hasName ? "delete" : "delete all";
    default:
      return method.toLowerCase();
  }
};

const describe = (verb: string, { resource, name, namespace, subresource }: KubeRequestTarget) =>
  [
    verb,
    resource ?? "",
    name ?? "",
    subresource && subresource !== verb ? `(${subresource})` : "",
    namespace ? `in namespace ${namespace}` : "",
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Decides what a request of an AI session needs. `url` is the path and query
 * as the cluster sees it (without ProLens' own prefix).
 */
export const classifyKubeRequest = (method: string, url: string, isUpgrade = false): KubeRequestDecision => {
  const parsed = new URL(url, "http://kube");
  const target = parseKubeApiPath(parsed.pathname);
  const upperMethod = method.toUpperCase();

  if (isUpgrade || (target.subresource && interactiveSubresources.has(target.subresource))) {
    return {
      kind: "approval",
      reason: "interactive",
      action: describe(target.subresource ?? "open a stream to", target),
    };
  }

  if (readMethods.has(upperMethod)) {
    if (target.resource === "secrets") {
      return { kind: "approval", reason: "secret", action: describe("read", target) };
    }

    return { kind: "read" };
  }

  // A server-side dry run is validated and answered, never persisted.
  if (parsed.searchParams.getAll("dryRun").includes("All")) {
    return { kind: "read" };
  }

  if (upperMethod === "POST" && target.resource && questionResources.has(target.resource)) {
    return { kind: "read" };
  }

  return { kind: "approval", reason: "mutation", action: describe(verbFor(upperMethod, Boolean(target.name)), target) };
};
