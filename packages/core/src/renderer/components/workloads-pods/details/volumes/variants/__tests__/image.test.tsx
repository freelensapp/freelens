/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageVolume } from "../image";

import type { PodContainerStatus } from "@freelensapp/kube-object";

const reference = "registry.example.com/assets:1.0";

const podWith = (containerStatuses: Partial<PodContainerStatus>[]) =>
  new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name: "some-pod",
      namespace: "default",
      uid: "some-uid",
      resourceVersion: "1",
      selfLink: "/api/v1/namespaces/default/pods/some-pod",
    },
    spec: {
      containers: [{ name: "app", image: "registry.example.com/app:1.0" }],
      volumes: [{ name: "assets", image: { reference } }],
    },
    status: {
      phase: "Running",
      conditions: [],
      podIP: "10.0.0.1",
      startTime: "2026-11-20T00:00:00Z",
      containerStatuses: containerStatuses as PodContainerStatus[],
    },
  });

const renderVolume = (pod: Pod) => render(<ImageVolume variant={{ reference }} pod={pod} volumeName="assets" />);

describe("the details of an image volume", () => {
  it("shows the reference with the digest the status of a container reports for the volume", () => {
    const pod = podWith([
      {
        name: "app",
        volumeMounts: [
          {
            name: "other",
            mountPath: "/other",
            volumeStatus: { image: { imageRef: "registry.example.com/other@sha256:9999" } },
          },
          {
            name: "assets",
            mountPath: "/assets",
            volumeStatus: { image: { imageRef: "registry.example.com/assets@sha256:0123" } },
          },
        ],
      },
    ]);
    const result = renderVolume(pod);
    const badge = result.container.querySelector(".ImageReference");

    expect(badge).toHaveTextContent(reference);
    expect(result.container).toHaveTextContent("registry.example.com/assets@sha256:0123");
    expect(result.container).not.toHaveTextContent("sha256:9999");
  });

  it("shows the reference without a tooltip when no status reports the digest", () => {
    const pod = podWith([{ name: "app", volumeMounts: [{ name: "assets", mountPath: "/assets" }] }]);
    const result = renderVolume(pod);

    expect(result.container.querySelector(".ImageReference")).toHaveTextContent(reference);
    expect(result.container).not.toHaveTextContent("sha256");
  });
});
