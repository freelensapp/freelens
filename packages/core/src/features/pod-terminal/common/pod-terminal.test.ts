/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { parsePodTerminalQuery, podTerminalQuery, podTerminalTargetError } from "./pod-terminal";

import type { PodTerminalTarget } from "./pod-terminal";

const toSearchParams = (query: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined));

describe("pod terminal query", () => {
  it.each<PodTerminalTarget>([
    { mode: "exec", namespace: "default", pod: "app", container: "main", windows: false },
    { mode: "exec", namespace: "default", pod: "app", container: undefined, windows: true },
    { mode: "attach", namespace: "kube-system", pod: "app.v1-abc", container: "sidecar", windows: false },
  ])("reads back the target it was made from: %o", (target) => {
    expect(parsePodTerminalQuery(toSearchParams(podTerminalQuery(target)))).toEqual(target);
  });

  it.each(["node", "standalone", null])("is no pod terminal for a type of %s", (type) => {
    const searchParams = new URLSearchParams({ namespace: "default", pod: "app" });

    if (type) {
      searchParams.set("type", type);
    }

    expect(parsePodTerminalQuery(searchParams)).toBeUndefined();
  });

  it("accepts the names Kubernetes accepts", () => {
    expect(
      podTerminalTargetError({ mode: "exec", namespace: "default", pod: "app-7d4b9.v2", container: "main-1" }),
    ).toBeUndefined();
  });

  it.each<[string, Partial<PodTerminalTarget>]>([
    ["an empty namespace", { namespace: "" }],
    ["a namespace that is an option", { namespace: "--kubeconfig=/tmp/x" }],
    ["an empty pod", { pod: "" }],
    ["a pod that is an option", { pod: "-it" }],
    ["a pod with spaces", { pod: "app; rm -rf /" }],
    ["a pod with upper case", { pod: "App" }],
    ["a container that is an option", { container: "--as=admin" }],
    ["a container with a dot", { container: "main.v1" }],
  ])("refuses %s", (_, change) => {
    expect(
      podTerminalTargetError({ mode: "exec", namespace: "default", pod: "app", container: "main", ...change }),
    ).toBeDefined();
  });
});
