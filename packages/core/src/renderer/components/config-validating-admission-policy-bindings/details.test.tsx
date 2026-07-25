/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ValidatingAdmissionPolicyBinding } from "@freelensapp/kube-object";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { ValidatingAdmissionPolicyBindingDetails } from "./validating-admission-policy-bindings-details";

import type {
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  ValidatingAdmissionPolicyBindingSpec,
} from "@freelensapp/kube-object";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";

const validatingAdmissionPolicyBinding: KubeJsonApiData<
  KubeObjectMetadata<KubeObjectScope.Cluster>,
  void,
  ValidatingAdmissionPolicyBindingSpec
> = {
  apiVersion: "admissionregistration.k8s.io/v1",
  kind: "ValidatingAdmissionPolicyBinding",
  metadata: {
    name: "demo-binding.example.com",
    resourceVersion: "1",
    uid: "demo-binding.example.com",
    selfLink: "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicybindings/demo-binding.example.com",
  },
  spec: {
    policyName: "demo-policy.example.com",
    validationActions: ["Deny", "Warn"],
    paramRef: {
      name: "replica-limit",
      namespace: "default",
      parameterNotFoundAction: "Deny",
    },
    matchResources: {
      matchPolicy: "Equivalent",
      resourceRules: [
        {
          apiGroups: ["apps"],
          apiVersions: ["v1"],
          operations: ["CREATE", "UPDATE"],
          resources: ["deployments"],
        },
      ],
    },
  },
};

describe("ValidatingAdmissionPolicyBindingDetails", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const binding = new ValidatingAdmissionPolicyBinding(validatingAdmissionPolicyBinding);

    result = render(<ValidatingAdmissionPolicyBindingDetails object={binding} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders with no param ref", () => {
    const binding = new ValidatingAdmissionPolicyBinding({
      ...validatingAdmissionPolicyBinding,
      spec: {
        policyName: "demo-policy.example.com",
        validationActions: ["Deny"],
      },
    });

    result = render(<ValidatingAdmissionPolicyBindingDetails object={binding} />);

    expect(result.baseElement).toMatchSnapshot();
  });
});
