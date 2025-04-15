/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { NetworkPolicy } from "@freelensapp/kube-object";
import { findByTestId, findByText } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import type { DiRender } from "../../test-utils/renderFor";
import { renderFor } from "../../test-utils/renderFor";
import { NetworkPolicyDetails } from "../network-policy-details";

describe("NetworkPolicyDetails", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("should render w/o errors", () => {
    const policy = new NetworkPolicy({
      metadata: {
        name: "some-network-policy-name",
        namespace: "some-namespace",
        resourceVersion: "1",
        selfLink: "/apis/networking.k8s.io/v1/namespace/some-namespace/some-network-policy-name",
        uid: "1",
      },
      spec: {
        podSelector: {},
      },
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
    });
    const { container } = render(<NetworkPolicyDetails object={policy} />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("should render egress nodeSelector", async () => {
    const policy = new NetworkPolicy({
      metadata: {
        name: "some-network-policy-name",
        namespace: "some-namespace",
        resourceVersion: "1",
        selfLink: "/apis/networking.k8s.io/v1/namespace/some-namespace/some-network-policy-name",
        uid: "1",
      },
      spec: {
        egress: [
          {
            to: [
              {
                namespaceSelector: {
                  matchLabels: {
                    foo: "bar",
                  },
                },
              },
            ],
          },
        ],
        podSelector: {},
      },
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
    });
    const { container } = render(<NetworkPolicyDetails object={policy} />);

    expect(await findByTestId(container, "egress-0")).toBeInstanceOf(HTMLElement);
    expect(await findByText(container, "foo: bar")).toBeInstanceOf(HTMLElement);
  });

  it("should not crash if egress nodeSelector doesn't have matchLabels", async () => {
    const policy = new NetworkPolicy({
      metadata: {
        name: "some-network-policy-name",
        namespace: "some-namespace",
        resourceVersion: "1",
        selfLink: "/apis/networking.k8s.io/v1/namespace/some-namespace/some-network-policy-name",
        uid: "1",
      },
      spec: {
        egress: [
          {
            to: [
              {
                namespaceSelector: {},
              },
            ],
          },
        ],
        podSelector: {},
      },
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
    });
    const { container } = render(<NetworkPolicyDetails object={policy} />);

    expect(container).toBeInstanceOf(HTMLElement);
  });
});
