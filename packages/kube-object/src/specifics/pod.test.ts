/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { Pod, type PodContainerStatus } from "./pod";

import type { Container } from "../types/container";

interface GetDummyPodOptions {
  running?: number;
  dead?: number;
  initRunning?: number;
  initDead?: number;
}

function getDummyPod(rawOpts: GetDummyPodOptions = {}): Pod {
  const { running = 0, dead = 0, initDead = 0, initRunning = 0 } = rawOpts;

  const containers: Container[] = [];
  const initContainers: Container[] = [];
  const containerStatuses: PodContainerStatus[] = [];
  const initContainerStatuses: PodContainerStatus[] = [];
  const pod = new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      uid: "1",
      name: "test",
      resourceVersion: "v1",
      namespace: "default",
      selfLink: "/api/v1/pods/default/test",
    },
    spec: {
      containers,
      initContainers,
      serviceAccount: "dummy",
      serviceAccountName: "dummy",
    },
    status: {
      phase: "Running",
      conditions: [],
      hostIP: "10.0.0.1",
      podIP: "10.0.0.1",
      startTime: "now",
      containerStatuses,
      initContainerStatuses,
    },
  });

  for (let i = 0; i < running; i += 1) {
    const name = `container_running_${i}`;

    containers.push({
      image: "dummy",
      imagePullPolicy: "Always",
      name,
    });
    containerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: true,
      restartCount: i,
      state: {
        running: {
          startedAt: "before",
        },
      },
    });
  }

  for (let i = 0; i < dead; i += 1) {
    const name = `container_dead_${i}`;

    containers.push({
      image: "dummy",
      imagePullPolicy: "Always",
      name,
    });
    containerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: false,
      restartCount: i,
      state: {
        terminated: {
          startedAt: "before",
          exitCode: i + 1,
          finishedAt: "later",
          reason: `reason_${i}`,
        },
      },
    });
  }

  for (let i = 0; i < initRunning; i += 1) {
    const name = `container_init-running_${i}`;

    initContainers.push({
      image: "dummy",
      imagePullPolicy: "Always",
      name,
    });
    initContainerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: true,
      restartCount: i,
      state: {
        running: {
          startedAt: "before",
        },
      },
    });
  }

  for (let i = 0; i < initDead; i += 1) {
    const name = `container_init-dead_${i}`;

    initContainers.push({
      image: "dummy",
      imagePullPolicy: "Always",
      name,
    });
    initContainerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: false,
      restartCount: i,
      state: {
        terminated: {
          startedAt: "before",
          exitCode: i + 1,
          finishedAt: "later",
          reason: `reason_${i}`,
        },
      },
    });
  }

  return pod;
}

describe("Pods", () => {
  const podTests = [];

  for (let r = 0; r < 3; r += 1) {
    for (let d = 0; d < 3; d += 1) {
      for (let ir = 0; ir < 3; ir += 1) {
        for (let id = 0; id < 3; id += 1) {
          podTests.push([r, d, ir, id]);
        }
      }
    }
  }

  describe.each(podTests)(
    "for [%d running, %d dead] & initial [%d running, %d dead]",
    (running, dead, initRunning, initDead) => {
      const pod = getDummyPod({ running, dead, initRunning, initDead });

      function getNamedContainer(name: string) {
        return {
          image: "dummy",
          imagePullPolicy: "Always",
          name,
        };
      }

      it("getRunningContainers should return only running and init running", () => {
        const res = [
          ...Array.from(new Array(running), (val, index) => getNamedContainer(`container_running_${index}`)),
          ...Array.from(new Array(initRunning), (val, index) => getNamedContainer(`container_init-running_${index}`)),
        ];

        expect(pod.getRunningContainers()).toStrictEqual(res);
      });

      it("getAllContainers should return all containers", () => {
        const res = [
          ...Array.from(new Array(running), (val, index) => getNamedContainer(`container_running_${index}`)),
          ...Array.from(new Array(dead), (val, index) => getNamedContainer(`container_dead_${index}`)),
          ...Array.from(new Array(initRunning), (val, index) => getNamedContainer(`container_init-running_${index}`)),
          ...Array.from(new Array(initDead), (val, index) => getNamedContainer(`container_init-dead_${index}`)),
        ];

        expect(pod.getAllContainers()).toStrictEqual(res);
      });

      it("getRestartsCount should return total restart counts", () => {
        function sum(len: number): number {
          let res = 0;

          for (let i = 0; i < len; i += 1) {
            res += i;
          }

          return res;
        }

        expect(pod.getRestartsCount()).toStrictEqual(sum(running) + sum(dead));
      });

      it("hasIssues should return true if a regular container terminated unsuccessfully", () => {
        expect(pod.hasIssues()).toStrictEqual(dead > 0);
      });
    },
  );

  describe("getSelectedNodeOs", () => {
    it("should return stable", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "kubernetes.io/os": "foobar",
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar");
    });

    it("should return beta", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "beta.kubernetes.io/os": "foobar1",
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar1");
    });

    it("should return stable over beta", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "kubernetes.io/os": "foobar2",
        "beta.kubernetes.io/os": "foobar3",
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar2");
    });

    it("should return undefined if none set", () => {
      const pod = getDummyPod();

      expect(pod.getSelectedNodeOs()).toStrictEqual(undefined);
    });
  });

  describe("hasIssues", () => {
    it("should return false if only the Ready condition is false", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status?.conditions.push({
        type: "Ready",
        status: "foobar",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return false if the only unready containers completed successfully", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.conditions.push({
        type: "Ready",
        status: "False",
        reason: "ContainersNotReady",
        message: "containers with unready status: [step-git-clone, step-build-go-binaries]",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });

      pod.spec.containers?.push(
        {
          image: "dummy",
          imagePullPolicy: "Always",
          name: "step-git-clone",
        },
        {
          image: "dummy",
          imagePullPolicy: "Always",
          name: "step-build-go-binaries",
        },
      );
      pod.status.containerStatuses?.push(
        {
          image: "dummy",
          imageID: "dummy",
          name: "step-git-clone",
          ready: false,
          restartCount: 0,
          state: {
            terminated: {
              exitCode: 0,
              finishedAt: "later",
              reason: "Completed",
              startedAt: "before",
            },
          },
        },
        {
          image: "dummy",
          imageID: "dummy",
          name: "step-build-go-binaries",
          ready: false,
          restartCount: 0,
          state: {
            terminated: {
              exitCode: 0,
              finishedAt: "later",
              reason: "Completed",
              startedAt: "before",
            },
          },
        },
      );

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return true if a running pod has an unready container", () => {
      const pod = getDummyPod({ running: 1 });
      const firstStatus = pod.status?.containerStatuses?.[0];

      assert(pod.status);
      assert(firstStatus);

      pod.status.phase = "Running";
      pod.status.conditions.push({
        type: "Ready",
        status: "False",
        reason: "ContainersNotReady",
        message: "containers with unready status: [container_running_0]",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });
      firstStatus.ready = false;

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a running pod has a readiness gate that is not ready", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Running";
      pod.spec.readinessGates = [{ conditionType: "example.com/ready" }];
      pod.status.conditions.push({
        type: "Ready",
        status: "False",
        reason: "ReadinessGatesNotReady",
        message: 'the status of pod readiness gate "example.com/ready" is not "True", but False',
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a restartable init container is not ready", () => {
      const pod = getDummyPod({ running: 1, initRunning: 1 });
      const firstInitContainer = pod.spec.initContainers?.[0];
      const firstInitStatus = pod.status?.initContainerStatuses?.[0];

      assert(firstInitContainer);
      assert(firstInitStatus);

      firstInitContainer.restartPolicy = "Always";
      firstInitStatus.ready = false;

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if a restartable init container completed successfully", () => {
      const pod = getDummyPod({ running: 1, initRunning: 1 });
      const firstInitContainer = pod.spec.initContainers?.[0];
      const firstInitStatus = pod.status?.initContainerStatuses?.[0];

      assert(firstInitContainer);
      assert(firstInitStatus);

      firstInitContainer.restartPolicy = "Always";
      firstInitStatus.ready = false;
      firstInitStatus.state = {
        terminated: {
          exitCode: 0,
          finishedAt: "later",
          reason: "Completed",
          startedAt: "before",
        },
      };

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return true if a readiness gate fails even when unready containers completed successfully", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.spec.readinessGates = [{ conditionType: "example.com/ready" }];
      pod.status.conditions.push(
        {
          type: "Ready",
          status: "False",
          reason: "ContainersNotReady",
          message: "containers with unready status: [step-git-clone]",
          lastProbeTime: 1,
          lastTransitionTime: "longer ago",
        },
        {
          type: "example.com/ready",
          status: "False",
          lastProbeTime: 1,
          lastTransitionTime: "longer ago",
        },
      );
      pod.spec.containers?.push({
        image: "dummy",
        imagePullPolicy: "Always",
        name: "step-git-clone",
      });
      pod.status.containerStatuses?.push({
        image: "dummy",
        imageID: "dummy",
        name: "step-git-clone",
        ready: false,
        restartCount: 0,
        state: {
          terminated: {
            exitCode: 0,
            finishedAt: "later",
            reason: "Completed",
            startedAt: "before",
          },
        },
      });

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a regular container status is missing", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status?.conditions.push({
        type: "Ready",
        status: "False",
        reason: "ContainersNotReady",
        message: "containers with unknown status: [missing-status]",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });
      pod.spec.containers?.push({
        image: "dummy",
        imagePullPolicy: "Always",
        name: "missing-status",
      });

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if a condition is non-ready", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status?.conditions.push({
        type: "dummy",
        status: "foobar",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return true if a current container is in a crash loop back off", () => {
      const pod = getDummyPod({ running: 1 });
      const firstStatus = pod.status?.containerStatuses?.[0];

      assert(firstStatus);

      firstStatus.state = {
        waiting: {
          reason: "CrashLoopBackOff",
          message: "too much foobar",
        },
      };

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if an ephemeral container is in a crash loop back off", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.ephemeralContainerStatuses = [
        {
          image: "dummy",
          imageID: "dummy",
          name: "debugger",
          ready: false,
          restartCount: 0,
          state: {
            waiting: {
              reason: "CrashLoopBackOff",
              message: "too much foobar",
            },
          },
        },
      ];

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if an ephemeral container is in a crash loop back off even when containers are ready", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.conditions.push({
        type: "ContainersReady",
        status: "True",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });
      pod.status.ephemeralContainerStatuses = [
        {
          image: "dummy",
          imageID: "dummy",
          name: "debugger",
          ready: false,
          restartCount: 0,
          state: {
            waiting: {
              reason: "CrashLoopBackOff",
              message: "too much foobar",
            },
          },
        },
      ];

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if containers and pod readiness conditions are true", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.spec.readinessGates = [{ conditionType: "example.com/ready" }];
      pod.status.conditions.push(
        {
          type: "ContainersReady",
          status: "True",
          lastProbeTime: 1,
          lastTransitionTime: "longer ago",
        },
        {
          type: "Ready",
          status: "True",
          lastProbeTime: 1,
          lastTransitionTime: "longer ago",
        },
      );

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return true if a current phase failed", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Failed";

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a current phase is pending", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Pending";

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a current phase is unknown", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Unknown";

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if a current phase is running", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Running";

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return false if a current phase succeeded", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Succeeded";

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return false if a succeeded pod has a readiness gate that is not ready", () => {
      const pod = getDummyPod({ running: 1 });

      assert(pod.status);

      pod.status.phase = "Succeeded";
      pod.spec.readinessGates = [{ conditionType: "example.com/ready" }];
      pod.status.conditions.push({
        type: "example.com/ready",
        status: "False",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago",
      });

      expect(pod.hasIssues()).toStrictEqual(false);
    });
  });
});
