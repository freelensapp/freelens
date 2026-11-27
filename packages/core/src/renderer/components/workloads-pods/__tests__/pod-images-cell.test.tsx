/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";

import { Pod } from "@freelensapp/kube-object";
import { render } from "@testing-library/react";
import { getPodContainerImages, PodImagesCell } from "../pod-images-cell";

import type { Container } from "@freelensapp/kube-object";

const podWith = (containers: Container[], initContainers: Container[] = []) =>
  new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name: "test-pod",
      namespace: "default",
      resourceVersion: "1",
      selfLink: "/api/v1/namespaces/default/pods/test-pod",
      uid: "pod-uid",
    },
    spec: { containers, initContainers },
  });

describe("<PodImagesCell />", () => {
  it("shows the image references of the containers, tag or digest included", () => {
    const pod = podWith(
      [
        { name: "app", image: "ghcr.io/example/app:1.2.3" },
        { name: "proxy", image: "envoyproxy/envoy@sha256:0123abcd" },
      ],
      [{ name: "init", image: "busybox:1.36" }],
    );

    const { container } = render(<PodImagesCell pod={pod} />);

    const images = [...container.querySelectorAll(".image")].map((image) => image.textContent);

    expect(images).toEqual(["ghcr.io/example/app:1.2.3", "envoyproxy/envoy@sha256:0123abcd"]);
    expect(container).not.toHaveTextContent("busybox");
  });

  it("shows a dash when no container names an image", () => {
    const { container } = render(<PodImagesCell pod={podWith([{ name: "app" }])} />);

    expect(container.querySelector(".PodImagesCell.none")).toHaveTextContent("-");
  });
});

describe("getPodContainerImages", () => {
  it("lists the image of each container in order, skipping containers without one", () => {
    const pod = podWith([{ name: "a", image: "nginx:1.27" }, { name: "b" }, { name: "c", image: "redis:7" }]);

    expect(getPodContainerImages(pod)).toEqual(["nginx:1.27", "redis:7"]);
  });
});
