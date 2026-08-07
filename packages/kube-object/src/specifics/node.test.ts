/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Node } from "./node";

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
