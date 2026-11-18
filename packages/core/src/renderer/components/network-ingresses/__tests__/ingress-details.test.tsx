/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Ingress } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { IngressDetails } from "../ingress-details";

import type { DiRender } from "../../test-utils/renderFor";

const createIngress = (spec: Partial<Ingress["spec"]>, annotations?: Record<string, string>) =>
  new Ingress({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: "some-ingress",
      namespace: "default",
      resourceVersion: "1",
      uid: "some-uid",
      selfLink: "/apis/networking.k8s.io/v1/namespaces/default/ingresses/some-ingress",
      annotations,
    },
    spec: {
      tls: [],
      ...spec,
    },
  });

describe("IngressDetails", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    render = renderFor(di);
  });

  it("given spec.ingressClassName, renders the class as a link to the IngressClass details", () => {
    const result = render(<IngressDetails object={createIngress({ ingressClassName: "nginx" })} />);
    const link = result.getByText("nginx");

    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toContain(encodeURIComponent("/apis/networking.k8s.io/v1/ingressclasses/nginx"));
  });

  it("given only the kubernetes.io/ingress.class annotation, renders the class from it as plain text", () => {
    const result = render(<IngressDetails object={createIngress({}, { "kubernetes.io/ingress.class": "traefik" })} />);

    expect(result.getByText("traefik").tagName).not.toBe("A");
    expect(result.container.querySelector("a")).toBeNull();
  });

  it("given no ingress class, does not render the class item", () => {
    const result = render(<IngressDetails object={createIngress({})} />);

    expect(result.queryByText("Class")).toBeNull();
  });
});
