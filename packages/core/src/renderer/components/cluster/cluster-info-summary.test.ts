/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Node } from "@freelensapp/kube-object";
import { describe, expect, it } from "vitest";
import {
  countDistinct,
  describeKubeletSkew,
  getKubeletSkew,
  hasKubeletSkew,
  parseMinorVersion,
  summarizeNodes,
} from "./cluster-info-summary";

import type { NodeSystemInfo } from "@freelensapp/kube-object";

interface TestNode {
  name: string;
  labels?: Record<string, string>;
  ready?: "True" | "False" | "Unknown";
  nodeInfo?: Partial<NodeSystemInfo>;
}

const createTestNode = ({ name, labels, ready, nodeInfo }: TestNode) =>
  new Node({
    apiVersion: "v1",
    kind: "Node",
    metadata: { name, uid: `${name}-uid`, resourceVersion: "1", selfLink: `/api/v1/nodes/${name}`, labels },
    status: {
      conditions: ready ? [{ type: "Ready", status: ready }] : undefined,
      nodeInfo: nodeInfo as NodeSystemInfo | undefined,
    },
  });

const linuxNode = (kubeletVersion: string) => ({
  kubeletVersion,
  osImage: "Ubuntu 24.04.1 LTS",
  operatingSystem: "linux",
  architecture: "amd64",
  containerRuntimeVersion: "containerd://1.7.22",
});

describe("parseMinorVersion", () => {
  it.each([
    ["v1.31.2", { major: 1, minor: 31 }],
    ["1.30.0", { major: 1, minor: 30 }],
    ["v1.30.4+k3s1", { major: 1, minor: 30 }],
    ["v1.29.8-eks-a737599", { major: 1, minor: 29 }],
  ])("reads %s", (version, expected) => {
    expect(parseMinorVersion(version)).toEqual(expected);
  });

  it.each(["unknown", "", "v1"])("reads no version from %j", (version) => {
    expect(parseMinorVersion(version)).toBeUndefined();
  });
});

describe("getKubeletSkew", () => {
  it("finds no skew when every kubelet runs the version of the API server", () => {
    const skew = getKubeletSkew(["v1.31.2"], "v1.31.2");

    expect(hasKubeletSkew(skew)).toBe(false);
  });

  it("allows a kubelet of a later patch of the same minor", () => {
    const skew = getKubeletSkew(["v1.31.4"], "v1.31.2");

    expect(skew.newerThanApiServer).toEqual([]);
    expect(hasKubeletSkew(skew)).toBe(false);
  });

  it("allows a kubelet three minors behind the API server", () => {
    expect(getKubeletSkew(["v1.28.9"], "v1.31.2").olderThanSupported).toEqual([]);
  });

  it("does not report kubelets that differ in their patch version only", () => {
    const skew = getKubeletSkew(["v1.31.2", "v1.31.4"], "v1.31.4");

    expect(skew).toEqual({ minorVersionsDiffer: false, newerThanApiServer: [], olderThanSupported: [] });
    expect(hasKubeletSkew(skew)).toBe(false);
  });

  it("reports kubelets of different minor versions", () => {
    const skew = getKubeletSkew(["v1.31.2", "v1.30.6"], "v1.31.2");

    expect(skew).toEqual({ minorVersionsDiffer: true, newerThanApiServer: [], olderThanSupported: [] });
  });

  it("reports a kubelet of a later minor than the API server", () => {
    expect(getKubeletSkew(["v1.32.0"], "v1.31.2").newerThanApiServer).toEqual(["v1.32.0"]);
  });

  it("reports a kubelet of a later major than the API server", () => {
    expect(getKubeletSkew(["v2.0.0"], "v1.31.2").newerThanApiServer).toEqual(["v2.0.0"]);
  });

  it("reports a kubelet more than three minors behind the API server", () => {
    expect(getKubeletSkew(["v1.27.3"], "v1.31.2").olderThanSupported).toEqual(["v1.27.3"]);
  });

  it("judges no kubelet against an unknown API server version", () => {
    const skew = getKubeletSkew(["v1.40.0"], "unknown");

    expect(skew).toEqual({ minorVersionsDiffer: false, newerThanApiServer: [], olderThanSupported: [] });
  });

  it("skips a kubelet version it cannot read", () => {
    expect(getKubeletSkew(["something"], "v1.31.2")).toEqual({
      minorVersionsDiffer: false,
      newerThanApiServer: [],
      olderThanSupported: [],
    });
  });

  it("describes each finding in a sentence", () => {
    const skew = getKubeletSkew(["v1.32.0", "v1.31.2", "v1.26.1"], "v1.31.2");

    expect(describeKubeletSkew(skew, "v1.31.2")).toEqual([
      "The nodes run kubelets of different minor versions.",
      "Kubelet v1.32.0 is newer than the API server (v1.31.2), which is not supported.",
      "Kubelet v1.26.1 is more than 3 minor versions older than the API server (v1.31.2), which is not supported.",
    ]);
  });
});

describe("countDistinct", () => {
  it("counts each value, the most common first, ties in natural order", () => {
    expect(countDistinct(["v1.30.10", "v1.30.9", "v1.31.0", "v1.31.0", undefined, " ", "v1.30.9"])).toEqual([
      { value: "v1.30.9", count: 2 },
      { value: "v1.31.0", count: 2 },
      { value: "v1.30.10", count: 1 },
    ]);
  });
});

describe("summarizeNodes", () => {
  it("summarizes no nodes", () => {
    expect(summarizeNodes([], "v1.31.2")).toEqual({
      total: 0,
      ready: 0,
      controlPlane: 0,
      workers: 0,
      kubeletVersions: [],
      osImages: [],
      platforms: [],
      containerRuntimes: [],
      skew: { minorVersionsDiffer: false, newerThanApiServer: [], olderThanSupported: [] },
    });
  });

  it("counts the nodes whose Ready condition is True", () => {
    const summary = summarizeNodes(
      [
        createTestNode({ name: "a", ready: "True" }),
        createTestNode({ name: "b", ready: "False" }),
        createTestNode({ name: "c", ready: "Unknown" }),
        createTestNode({ name: "d" }),
      ],
      "v1.31.2",
    );

    expect(summary.ready).toBe(1);
    expect(summary.total).toBe(4);
  });

  it("counts control plane nodes by the current and the legacy role label", () => {
    const summary = summarizeNodes(
      [
        createTestNode({ name: "cp", labels: { "node-role.kubernetes.io/control-plane": "" } }),
        createTestNode({ name: "master", labels: { "node-role.kubernetes.io/master": "" } }),
        createTestNode({ name: "worker", labels: { "node-role.kubernetes.io/worker": "" } }),
        createTestNode({ name: "plain" }),
      ],
      "v1.31.2",
    );

    expect(summary.controlPlane).toBe(2);
    expect(summary.workers).toBe(2);
  });

  it("lists the distinct kubelet versions, systems, platforms and runtimes", () => {
    const summary = summarizeNodes(
      [
        createTestNode({ name: "a", nodeInfo: linuxNode("v1.31.2") }),
        createTestNode({ name: "b", nodeInfo: linuxNode("v1.31.2") }),
        createTestNode({
          name: "c",
          nodeInfo: { ...linuxNode("v1.30.6"), architecture: "arm64", osImage: "Bottlerocket OS 1.26.1" },
        }),
      ],
      "v1.31.2",
    );

    expect(summary.kubeletVersions).toEqual([
      { value: "v1.31.2", count: 2 },
      { value: "v1.30.6", count: 1 },
    ]);
    expect(summary.osImages).toEqual([
      { value: "Ubuntu 24.04.1 LTS", count: 2 },
      { value: "Bottlerocket OS 1.26.1", count: 1 },
    ]);
    expect(summary.platforms).toEqual([
      { value: "linux/amd64", count: 2 },
      { value: "linux/arm64", count: 1 },
    ]);
    expect(summary.containerRuntimes).toEqual([{ value: "containerd://1.7.22", count: 3 }]);
    expect(summary.skew.minorVersionsDiffer).toBe(true);
  });

  it("leaves out what a node does not report", () => {
    const summary = summarizeNodes(
      [createTestNode({ name: "a", nodeInfo: { operatingSystem: "linux" } }), createTestNode({ name: "b" })],
      "unknown",
    );

    expect(summary.kubeletVersions).toEqual([]);
    expect(summary.osImages).toEqual([]);
    expect(summary.platforms).toEqual([]);
    expect(summary.containerRuntimes).toEqual([]);
    expect(hasKubeletSkew(summary.skew)).toBe(false);
  });
});
