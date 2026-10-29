/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdmissionPolicySelectors } from "./admission-policy-selectors";

describe("AdmissionPolicySelectors", () => {
  it("shows label matches and every expression operator", () => {
    const result = render(
      <AdmissionPolicySelectors
        namespaceSelector={{
          matchLabels: { environment: "production", enabled: "" },
          matchExpressions: [
            { key: "region", operator: "In", values: ["east", "west"] },
            { key: "team", operator: "NotIn", values: ["sandbox"] },
            { key: "managed", operator: "Exists" },
            { key: "excluded", operator: "DoesNotExist" },
          ],
        }}
        objectSelector={{ matchLabels: { app: "api" } }}
      />,
    );

    expect(result.getByText("Namespace Selector")).toBeInTheDocument();
    expect(result.getByText("environment=production")).toBeInTheDocument();
    expect(result.getByText("enabled=")).toBeInTheDocument();
    expect(result.getByText("region in (east, west)")).toBeInTheDocument();
    expect(result.getByText("team notin (sandbox)")).toBeInTheDocument();
    expect(result.getByText("managed")).toBeInTheDocument();
    expect(result.getByText("!excluded")).toBeInTheDocument();
    expect(result.getByText("Object Selector")).toBeInTheDocument();
    expect(result.getByText("app=api")).toBeInTheDocument();
  });

  it("shows that empty selectors match all", () => {
    const result = render(
      <AdmissionPolicySelectors namespaceSelector={{}} objectSelector={{ matchLabels: {}, matchExpressions: [] }} />,
    );

    expect(result.getByText("Namespace Selector")).toBeInTheDocument();
    expect(result.getByText("Object Selector")).toBeInTheDocument();
    expect(result.getAllByText("All")).toHaveLength(2);
  });

  it("omits selectors that are not specified", () => {
    const result = render(<AdmissionPolicySelectors />);

    expect(result.queryByText("Namespace Selector")).not.toBeInTheDocument();
    expect(result.queryByText("Object Selector")).not.toBeInTheDocument();
  });
});
