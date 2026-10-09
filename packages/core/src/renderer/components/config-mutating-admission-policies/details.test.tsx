/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { MutatingAdmissionPolicy } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { MutatingAdmissionPolicyDetails } from "./mutating-admission-policies-details";

import type {
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  MutatingAdmissionPolicySpec,
} from "@freelensapp/kube-object";

import type { RenderResult } from "@testing-library/react";

import type { DiRender } from "../test-utils/renderFor";

const mutatingAdmissionPolicy: KubeJsonApiData<
  KubeObjectMetadata<KubeObjectScope.Cluster>,
  void,
  MutatingAdmissionPolicySpec
> = {
  apiVersion: "admissionregistration.k8s.io/v1",
  kind: "MutatingAdmissionPolicy",
  metadata: {
    name: "sidecar-policy.example.com",
    resourceVersion: "1",
    uid: "sidecar-policy.example.com",
    selfLink: "/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicies/sidecar-policy.example.com",
  },
  spec: {
    failurePolicy: "Fail",
    reinvocationPolicy: "IfNeeded",
    paramKind: {
      apiVersion: "mutations.example.com/v1",
      kind: "Sidecar",
    },
    matchConstraints: {
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
    matchConditions: [
      {
        name: "does-not-already-have-sidecar",
        expression: '!object.spec.initContainers.exists(ic, ic.name == "mesh-proxy")',
      },
    ],
    variables: [
      {
        name: "containerName",
        expression: "params.name",
      },
    ],
    mutations: [
      {
        patchType: "ApplyConfiguration",
        applyConfiguration: {
          expression:
            'Object{spec: Object.spec{initContainers: [Object.spec.initContainers{name: "mesh-proxy", image: "mesh/proxy:v1.0.0"}]}}',
        },
      },
      {
        patchType: "JSONPatch",
        jsonPatch: {
          expression: '[JSONPatch{op: "add", path: "/metadata/labels/injected", value: "true"}]',
        },
      },
    ],
  },
};

describe("MutatingAdmissionPolicyDetails", () => {
  let result: RenderResult;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders", () => {
    const policy = new MutatingAdmissionPolicy(mutatingAdmissionPolicy);

    result = render(<MutatingAdmissionPolicyDetails object={policy} />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders with no mutations", () => {
    const policy = new MutatingAdmissionPolicy({
      ...mutatingAdmissionPolicy,
      spec: {
        ...mutatingAdmissionPolicy.spec,
        mutations: [],
      },
    });

    result = render(<MutatingAdmissionPolicyDetails object={policy} />);

    expect(result.baseElement).toMatchSnapshot();
  });
});
