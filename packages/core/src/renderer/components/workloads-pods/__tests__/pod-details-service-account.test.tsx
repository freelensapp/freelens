/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { PodDetails } from "../pod-details";

import type { PodStatus } from "@freelensapp/kube-object";

vi.mock("../details/containers/pod-details-containers", () => ({ PodDetailsContainers: () => null }));
vi.mock("../details/containers/pod-details-init-containers", () => ({ PodDetailsInitContainers: () => null }));
vi.mock("../details/containers/pod-details-ephemeral-containers", () => ({
  PodDetailsEphemeralContainers: () => null,
}));
vi.mock("../details/volumes/view", () => ({ PodVolumes: () => null }));
vi.mock("../../kube-object-link", () => ({
  LinkToNode: () => null,
  LinkToPriorityClass: () => null,
  LinkToRuntimeClass: () => null,
  LinkToServiceAccount: ({ name }: { name: string }) => <span>{name}</span>,
}));

describe("pod-details service account", () => {
  const renderPod = (serviceAccountName?: string) => {
    const render = renderFor(getDiForUnitTesting());
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
        containers: [{ name: "main" }],
        ...(serviceAccountName ? { serviceAccountName } : {}),
      },
      status: {} as PodStatus,
    });

    render(<PodDetails object={pod} />);
  };

  it("shows the Service Account when the pod has one", () => {
    renderPod("my-account");

    expect(screen.getByText("Service Account")).toBeInTheDocument();
    expect(screen.getByText("my-account")).toBeInTheDocument();
  });

  it("hides the Service Account when the pod has none", () => {
    renderPod();

    expect(screen.queryByText("Service Account")).not.toBeInTheDocument();
  });
});
