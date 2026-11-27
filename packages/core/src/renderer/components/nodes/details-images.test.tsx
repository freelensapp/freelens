/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";

import { Node } from "@freelensapp/kube-object";
import { fireEvent } from "@testing-library/react";
import directoryForLensLocalStorageInjectable from "../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { NodeDetailsImages } from "./details-images";

import type { ContainerImage } from "@freelensapp/kube-object";

import type { DiRender } from "../test-utils/renderFor";

const nodeWith = (images?: ContainerImage[]) =>
  new Node({
    apiVersion: "v1",
    kind: "Node",
    metadata: { name: "some-node", uid: "some-uid", resourceVersion: "1", selfLink: "/api/v1/nodes/some-node" },
    status: { images },
  });

const images: ContainerImage[] = [
  { names: ["registry.k8s.io/pause@sha256:4567", "registry.k8s.io/pause:3.10"], sizeBytes: 320_000 },
  { names: ["docker.io/library/nginx@sha256:0123", "docker.io/library/nginx:1.27"], sizeBytes: 72_000_000 },
  { names: ["quay.io/some/sidecar@sha256:89ab"], sizeBytes: 5_000_000 },
];

// The badges of each row, without the tooltips that hold the digests.
const rowNames = (container: HTMLElement) =>
  [...container.querySelectorAll(".TableRow .name")].map((cell) =>
    [...cell.querySelectorAll(".ImageReference")].map((badge) => badge.textContent).join(" "),
  );

describe("<NodeDetailsImages />", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForLensLocalStorageInjectable, () => "some-directory-for-lens-local-storage");
    render = renderFor(di);
  });

  it("lists the images of the node with their sizes, the largest first", () => {
    const { container, getByText } = render(<NodeDetailsImages node={nodeWith(images)} />);

    expect(getByText("Images (3)")).toBeInTheDocument();
    expect(rowNames(container)).toEqual([
      "docker.io/library/nginx:1.27",
      "quay.io/some/sidecar@sha256:89ab",
      "registry.k8s.io/pause:3.10",
    ]);
    expect([...container.querySelectorAll(".TableRow .size")].map((cell) => cell.textContent)).toEqual([
      "68.7MiB",
      "4.8MiB",
      "312.5KiB",
    ]);
  });

  it("shows the digests of a tagged image as its tooltip", () => {
    const { container } = render(<NodeDetailsImages node={nodeWith(images)} />);
    const [nginxRow] = container.querySelectorAll(".TableRow .name");

    expect(nginxRow.querySelector(".ImageReference")).toHaveTextContent("docker.io/library/nginx:1.27");
    expect(nginxRow.querySelector(".ImageReference")).not.toHaveTextContent("sha256");
    expect(nginxRow).toHaveTextContent("docker.io/library/nginx@sha256:0123");
  });

  it("filters the images by tag or digest", () => {
    const { container, getByTestId, getByText } = render(<NodeDetailsImages node={nodeWith(images)} />);
    const filter = getByTestId("node-images-filter");

    fireEvent.change(filter, { target: { value: "PAUSE" } });
    expect(rowNames(container)).toEqual(["registry.k8s.io/pause:3.10"]);

    fireEvent.change(filter, { target: { value: "sha256:89ab" } });
    expect(rowNames(container)).toEqual(["quay.io/some/sidecar@sha256:89ab"]);

    fireEvent.change(filter, { target: { value: "redis" } });
    expect(rowNames(container)).toEqual([]);
    expect(getByText("No images match the filter.")).toBeInTheDocument();
  });

  it.each([
    ["no list of images", undefined],
    ["an empty list of images", []],
  ])("renders nothing for a node with %s", (_, nodeImages) => {
    const { container } = render(<NodeDetailsImages node={nodeWith(nodeImages)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says that the list can be cut when it has as many images as the kubelet reports by default", () => {
    const fifty = Array.from({ length: 50 }, (_, index) => ({
      names: [`example.com/image:${index}`],
      sizeBytes: index,
    }));
    const { getByTestId } = render(<NodeDetailsImages node={nodeWith(fifty)} />);

    expect(getByTestId("node-images-limit-note")).toHaveTextContent("at most 50 images");
  });

  it("does not show the note for a shorter list", () => {
    const { queryByTestId } = render(<NodeDetailsImages node={nodeWith(images)} />);

    expect(queryByTestId("node-images-limit-note")).not.toBeInTheDocument();
  });
});
