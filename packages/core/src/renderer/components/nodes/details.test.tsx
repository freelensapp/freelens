/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";

import { Node } from "@freelensapp/kube-object";
import directoryForLensLocalStorageInjectable from "../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { renderFor } from "../test-utils/renderFor";
import loadPodsFromAllNamespacesInjectable from "../workloads-pods/load-pods-from-all-namespaces.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { NodeDetails } from "./details";

import type { DiRender } from "../test-utils/renderFor";
import type { PodStore } from "../workloads-pods/store";

describe("<NodeDetails />", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForLensLocalStorageInjectable, () => "some-directory-for-lens-local-storage");
    di.override(subscribeStoresInjectable, () => () => () => {});
    di.override(loadPodsFromAllNamespacesInjectable, () => () => {});
    di.override(
      podStoreInjectable,
      () => ({ isLoaded: true, getPodsByNode: () => [], loadKubeMetrics: async () => {} }) as unknown as PodStore,
    );
    render = renderFor(di);
  });

  it("shows the images that the status of the node reports", () => {
    const node = new Node({
      apiVersion: "v1",
      kind: "Node",
      metadata: { name: "some-node", uid: "some-uid", resourceVersion: "1", selfLink: "/api/v1/nodes/some-node" },
      spec: {},
      status: {
        images: [{ names: ["docker.io/library/nginx@sha256:0123", "docker.io/library/nginx:1.27"], sizeBytes: 1024 }],
      },
    });
    const { getByText } = render(<NodeDetails object={node} />);

    expect(getByText("Images (1)")).toBeInTheDocument();
    expect(getByText("docker.io/library/nginx:1.27")).toBeInTheDocument();
  });
});
