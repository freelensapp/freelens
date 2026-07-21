/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApiErrorParsed } from "./json-api";

import type { JsonApiError, KubeJsonApiError } from "./json-api";

describe("JsonApiErrorParsed", () => {
  it("exposes the parsed JsonApiError via the data getter", () => {
    const parsedError: JsonApiError = { code: 404, message: "Not Found" };
    const error = new JsonApiErrorParsed(parsedError, ["Not Found"]);

    expect(error.data).toBe(parsedError);
  });

  it("exposes the parsed KubeJsonApiError via the data getter", () => {
    const parsedError: KubeJsonApiError = {
      kind: "Status",
      apiVersion: "v1",
      metadata: {},
      status: "Failure",
      message: "some kube error",
      reason: "NotFound",
      details: { name: "some-name", group: "some-group", kind: "some-kind", causes: [] },
      code: 404,
    };
    const error = new JsonApiErrorParsed(parsedError, ["some kube error"]);

    expect(error.data).toBe(parsedError);
  });

  it("exposes a DOMException via the data getter", () => {
    const parsedError = new DOMException("The operation was aborted", "AbortError");
    const error = new JsonApiErrorParsed(parsedError, ["The operation was aborted"]);

    expect(error.data).toBe(parsedError);
  });
});
