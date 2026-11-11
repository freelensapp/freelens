/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { RuntimeClass } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { RuntimeClassesDetails } from "./runtime-classes-details";

import type { RuntimeClassData } from "@freelensapp/kube-object";

import type { DiRender } from "../test-utils/renderFor";

const runtimeClassData: RuntimeClassData = {
  apiVersion: "node.k8s.io/v1",
  kind: "RuntimeClass",
  metadata: {
    name: "kata-qemu",
    resourceVersion: "1",
    uid: "kata-qemu",
    selfLink: "/apis/node.k8s.io/v1/runtimeclasses/kata-qemu",
  },
  handler: "kata-qemu",
};

describe("RuntimeClassesDetails", () => {
  let render: DiRender;

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
  });

  it("shows the fixed overhead of a pod, which the API gives as a list of resources", () => {
    const result = render(
      <RuntimeClassesDetails
        object={new RuntimeClass({ ...runtimeClassData, overhead: { podFixed: { cpu: "250m", memory: "160Mi" } } })}
      />,
    );

    expect(result.getByText("Pod Fixed")).toBeInTheDocument();
    expect(result.getByText("cpu: 250m, memory: 160Mi")).toBeInTheDocument();
  });

  it("leaves out the fixed overhead when the class has none", () => {
    const result = render(<RuntimeClassesDetails object={new RuntimeClass(runtimeClassData)} />);

    expect(result.getByText("kata-qemu")).toBeInTheDocument();
    expect(result.queryByText("Pod Fixed")).toBeNull();
  });
});
