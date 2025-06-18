/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { MutatingWebhookConfiguration } from "@freelensapp/kube-object";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { MutatingWebhookDetails } from "./mutating-webhook-configurations-details";

import type { MutatingWebhookConfigurationData } from "@freelensapp/kube-object";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";

const mutatingWebhookConfig: MutatingWebhookConfigurationData = {
  apiVersion: "admissionregistration.k8s.io/v1",
  kind: "MutatingWebhookConfiguration",
  metadata: {
    name: "pod-policy.example.com",
    resourceVersion: "1",
    uid: "pod-policy.example.com",
    namespace: "default",
    selfLink: "/apis/admissionregistration.k8s.io/v1/pod-policy.example.com",
  },
  webhooks: [
    {
      name: "pod-policy.example.com",
      rules: [
        {
          apiGroups: ["", "apps", "extensions"],
          apiVersions: ["v1", "v1beta1"],
          operations: ["CREATE", "UPDATE"],
          resources: ["pods", "deployments"],
        },
      ],
      failurePolicy: "Fail",
      admissionReviewVersions: ["v1", "v1beta1"],
      sideEffects: "None",
      clientConfig: {
        service: {
          namespace: "service-namespace",
          name: "service-name",
        },
        caBundle: "Cg==",
      },
    },
  ],
};

describe("MutatingWebhookConfigsDetails", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const webhookConfig = new MutatingWebhookConfiguration(mutatingWebhookConfig);

    result = render(<MutatingWebhookDetails object={webhookConfig} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders with no webhooks", () => {
    const webhookConfig = new MutatingWebhookConfiguration({
      ...mutatingWebhookConfig,
      webhooks: [],
    });

    result = render(<MutatingWebhookDetails object={webhookConfig} />);

    expect(result.baseElement).toMatchSnapshot();
  });
});
