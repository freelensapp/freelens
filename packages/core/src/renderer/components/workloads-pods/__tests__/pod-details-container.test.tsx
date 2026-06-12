/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { disposer } from "@freelensapp/utilities";
import { screen } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import portForwardStoreInjectable from "../../../port-forward/port-forward-store/port-forward-store.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { PodDetailsContainer } from "../pod-details-container";

import type { PodStatus } from "@freelensapp/kube-object";

jest.mock("../pod-container-env", () => ({
  ContainerEnvironment: () => null,
}));

describe("pod-details-container", () => {
  it("renders container resize policy", () => {
    const di = getDiForUnitTesting();

    di.override(portForwardStoreInjectable, () => ({
      watch: () => disposer(),
    }));

    const render = renderFor(di);
    const pod = new Pod({
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: "test-pod",
        namespace: "default",
        resourceVersion: "1",
        selfLink: "/api/v1/namespaces/default/pods/test-pod",
        uid: "pod-uid",
      },
      spec: {
        containers: [
          {
            name: "main",
            resizePolicy: [
              {
                resourceName: "cpu",
                restartPolicy: "NotRequired",
              },
              {
                resourceName: "memory",
                restartPolicy: "RestartContainer",
              },
            ],
          },
        ],
      },
      status: {} as PodStatus,
    });

    render(<PodDetailsContainer pod={pod} container={pod.getContainersWithType()[0]} />);

    expect(screen.getByText("Resize Policy")).toBeInTheDocument();
    expect(screen.getByText("cpu=NotRequired")).toBeInTheDocument();
    expect(screen.getByText("memory=RestartContainer")).toBeInTheDocument();
  });
});
