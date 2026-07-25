/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ValidatingAdmissionPolicy } from "@freelensapp/kube-object";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { ValidatingAdmissionPolicyDetails } from "./validating-admission-policies-details";

import type {
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  ValidatingAdmissionPolicySpec,
  ValidatingAdmissionPolicyStatus,
} from "@freelensapp/kube-object";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";

const validatingAdmissionPolicy: KubeJsonApiData<
  KubeObjectMetadata<KubeObjectScope.Cluster>,
  ValidatingAdmissionPolicyStatus,
  ValidatingAdmissionPolicySpec
> = {
  apiVersion: "admissionregistration.k8s.io/v1",
  kind: "ValidatingAdmissionPolicy",
  metadata: {
    name: "demo-policy.example.com",
    resourceVersion: "1",
    uid: "demo-policy.example.com",
    selfLink: "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies/demo-policy.example.com",
  },
  spec: {
    failurePolicy: "Fail",
    paramKind: {
      apiVersion: "rules.example.com/v1",
      kind: "ReplicaLimit",
    },
    matchConstraints: {
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
    matchConditions: [
      {
        name: "exclude-leases",
        expression: "!(request.resource.group == 'coordination.k8s.io' && request.resource.resource == 'leases')",
      },
    ],
    variables: [
      {
        name: "replicas",
        expression: "object.spec.replicas",
      },
    ],
    validations: [
      {
        expression: "object.spec.replicas <= 5",
        message: "Too many replicas",
        reason: "Invalid",
      },
    ],
    auditAnnotations: [
      {
        key: "high-replica-count",
        valueExpression: "'Deployment spec.replicas set to ' + string(object.spec.replicas)",
      },
    ],
  },
};

describe("ValidatingAdmissionPolicyDetails", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const policy = new ValidatingAdmissionPolicy(validatingAdmissionPolicy);

    result = render(<ValidatingAdmissionPolicyDetails object={policy} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders with no validations", () => {
    const policy = new ValidatingAdmissionPolicy({
      ...validatingAdmissionPolicy,
      spec: {
        ...validatingAdmissionPolicy.spec,
        validations: [],
      },
    });

    result = render(<ValidatingAdmissionPolicyDetails object={policy} />);

    expect(result.baseElement).toMatchSnapshot();
  });
});
