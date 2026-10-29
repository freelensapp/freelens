/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { MutatingAdmissionPolicyBinding } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { MutatingAdmissionPolicyBindingDetails } from "./mutating-admission-policy-bindings-details";

import type {
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  MutatingAdmissionPolicyBindingSpec,
} from "@freelensapp/kube-object";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";

const mutatingAdmissionPolicyBinding: KubeJsonApiData<
  KubeObjectMetadata<KubeObjectScope.Cluster>,
  void,
  MutatingAdmissionPolicyBindingSpec
> = {
  apiVersion: "admissionregistration.k8s.io/v1",
  kind: "MutatingAdmissionPolicyBinding",
  metadata: {
    name: "sidecar-binding.example.com",
    resourceVersion: "1",
    uid: "sidecar-binding.example.com",
    selfLink: "/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicybindings/sidecar-binding.example.com",
  },
  spec: {
    policyName: "sidecar-policy.example.com",
    paramRef: {
      name: "mesh-proxy",
      namespace: "default",
      parameterNotFoundAction: "Deny",
    },
    matchResources: {
      matchPolicy: "Equivalent",
      resourceRules: [
        {
          apiGroups: [""],
          apiVersions: ["v1"],
          operations: ["CREATE"],
          resources: ["pods"],
        },
      ],
    },
  },
};

describe("MutatingAdmissionPolicyBindingDetails", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const binding = new MutatingAdmissionPolicyBinding(mutatingAdmissionPolicyBinding);

    result = render(<MutatingAdmissionPolicyBindingDetails object={binding} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders match resource selectors", () => {
    const binding = new MutatingAdmissionPolicyBinding({
      ...mutatingAdmissionPolicyBinding,
      spec: {
        ...mutatingAdmissionPolicyBinding.spec,
        matchResources: {
          namespaceSelector: { matchLabels: { environment: "production" } },
          objectSelector: { matchExpressions: [{ key: "injected", operator: "DoesNotExist" }] },
        },
      },
    });

    result = render(<MutatingAdmissionPolicyBindingDetails object={binding} />);

    expect(result.getByText("Namespace Selector")).toBeInTheDocument();
    expect(result.getByText("environment=production")).toBeInTheDocument();
    expect(result.getByText("Object Selector")).toBeInTheDocument();
    expect(result.getByText("!injected")).toBeInTheDocument();
  });

  it("renders with no param ref", () => {
    const binding = new MutatingAdmissionPolicyBinding({
      ...mutatingAdmissionPolicyBinding,
      spec: {
        policyName: "sidecar-policy.example.com",
      },
    });

    result = render(<MutatingAdmissionPolicyBindingDetails object={binding} />);

    expect(result.baseElement).toMatchSnapshot();
  });
});
