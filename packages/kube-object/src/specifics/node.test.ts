/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { Node } from "./node";

import type { NodeCondition } from "./node";

describe("Node tests", () => {
  describe("isMasterNode()", () => {
    it("given a master node labelled before kubernetes 1.20, should return true", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "node-role.kubernetes.io/master": "NoSchedule",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.isMasterNode()).toBe(true);
    });

    it("given a master node labelled after kubernetes 1.20, should return true", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "node-role.kubernetes.io/control-plane": "NoSchedule",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.isMasterNode()).toBe(true);
    });

    it("given a non master node, should return false", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {},
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.isMasterNode()).toBe(false);
    });
  });

  describe("getRoleLabels()", () => {
    it("should return empty string if labels is not present", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("");
    });

    it("should return empty string if labels is empty object", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {},
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("");
    });

    it("should return rest of keys with substring node-role.kubernetes.io/", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "node-role.kubernetes.io/foobar": "bat",
            "hellonode-role.kubernetes.io/foobar1": "bat",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("foobar, foobar1");
    });

    it("should return rest of keys with substring node-role.kubernetes.io/ after last /", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "node-role.kubernetes.io/foobar": "bat",
            "hellonode-role.kubernetes.io//////foobar1": "bat",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("foobar, foobar1");
    });

    it("should return value of label kubernetes.io/role if present", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "kubernetes.io/role": "master",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("master");
    });

    it("should return value of label node.kubernetes.io/role if present", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "node.kubernetes.io/role": "master",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("master");
    });

    it("all sources should be joined together", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          labels: {
            "aksjhdkjahsdnode-role.kubernetes.io/foobar": "bat",
            "kubernetes.io/role": "master",
            "node.kubernetes.io/role": "master-v2-max",
          },
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getRoleLabels()).toBe("foobar, master, master-v2-max");
    });
  });

  describe("getWarningConditions()", () => {
    const createNode = (conditions: NodeCondition[]) =>
      new Node({
        apiVersion: "v1",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          selfLink: "/api/v1/nodes/bar",
        },
        spec: {},
        status: {
          conditions,
        },
      });

    const pressureTypes = ["MemoryPressure", "DiskPressure", "PIDPressure", "NetworkUnavailable"];

    it("given a ready node without pressure, should return no warnings", () => {
      const node = createNode([
        { type: "Ready", status: "True" },
        ...pressureTypes.map((type): NodeCondition => ({ type, status: "False" })),
      ]);

      expect(node.getWarningConditions()).toEqual([]);
    });

    it("given k3s's EtcdIsVoter condition, should not return it as a warning", () => {
      const node = createNode([
        { type: "Ready", status: "True" },
        {
          type: "EtcdIsVoter",
          status: "True",
          reason: "MemberNotLearner",
          message: "Node is a voting member of the etcd cluster",
        },
      ]);

      expect(node.getWarningConditions()).toEqual([]);
    });

    it("given conditions that kubernetes does not define, should not judge them", () => {
      const node = createNode([
        { type: "Ready", status: "True" },
        { type: "KernelDeadlock", status: "True" },
        { type: "XfsShutdown", status: "True" },
        { type: "HostUpgrades", status: "True" },
        { type: "SchedulingDisabled", status: "True" },
      ]);

      expect(node.getWarningConditions()).toEqual([]);
    });

    it.each(["False", "Unknown"] as const)("given Ready=%s, should return it as a warning", (status) => {
      const ready: NodeCondition = { type: "Ready", status, message: "Kubelet stopped posting node status." };
      const node = createNode([ready]);

      expect(node.getWarningConditions()).toEqual([ready]);
    });

    it.each(pressureTypes)("given %s=True, should return it as a warning", (type) => {
      const pressure: NodeCondition = { type, status: "True", message: `${type} on the node` };
      const node = createNode([{ type: "Ready", status: "True" }, pressure]);

      expect(node.getWarningConditions()).toEqual([pressure]);
    });
  });

  describe("getKernelVersion()", () => {
    it("should return the kernel version from status.nodeInfo", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          selfLink: "/api/v1/nodes/bar",
        },
        status: {
          nodeInfo: {
            architecture: "amd64",
            bootID: "boot",
            containerRuntimeVersion: "containerd://1.7.22",
            kernelVersion: "6.8.0-45-generic",
            kubeProxyVersion: "v1.31.1",
            kubeletVersion: "v1.31.1",
            machineID: "machine",
            operatingSystem: "linux",
            osImage: "Ubuntu 24.04.1 LTS",
            systemUUID: "system",
          },
        },
      });

      expect(node.getKernelVersion()).toBe("6.8.0-45-generic");
    });

    it("should return <unknown> if nodeInfo is not present", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          selfLink: "/api/v1/nodes/bar",
        },
        status: {},
      });

      expect(node.getKernelVersion()).toBe("<unknown>");
    });

    it("should return <unknown> if status is not present", () => {
      const node = new Node({
        apiVersion: "foo",
        kind: "Node",
        metadata: {
          name: "bar",
          resourceVersion: "1",
          uid: "bat",
          selfLink: "/api/v1/nodes/bar",
        },
      });

      expect(node.getKernelVersion()).toBe("<unknown>");
    });
  });
});
