/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL, urlBuilderFor } from "./buildUrl";

describe("buildURL", () => {
  it("builds a static path", () => {
    expect(buildURL("/pods")).toBe("/pods");
  });

  it("substitutes required parameters", () => {
    expect(buildURL("/crd/:group/:name", { params: { group: "g", name: "n" } })).toBe("/crd/g/n");
  });

  it("appends query parameters and fragment", () => {
    expect(buildURL("/pods", { query: { all: "true" }, fragment: "top" })).toBe("/pods?all=true#top");
  });

  describe("react-router v5 optional parameters (`/:param?`)", () => {
    it("omits missing optional parameters", () => {
      expect(buildURL("/helm/releases/:namespace?/:name?")).toBe("/helm/releases");
    });

    it("includes a single provided optional parameter", () => {
      expect(buildURL("/helm/releases/:namespace?/:name?", { params: { namespace: "kube-system" } })).toBe(
        "/helm/releases/kube-system",
      );
    });

    it("includes all provided optional parameters", () => {
      expect(
        buildURL("/helm/releases/:namespace?/:name?", { params: { namespace: "kube-system", name: "coredns" } }),
      ).toBe("/helm/releases/kube-system/coredns");
    });

    it("keeps a required parameter before an optional one", () => {
      expect(
        buildURL("/preferences/extension/:extensionId/:preferenceTabId?", { params: { extensionId: "my-ext" } }),
      ).toBe("/preferences/extension/my-ext");
    });
  });
});

describe("urlBuilderFor", () => {
  it("compiles positional parameters", () => {
    const builder = urlBuilderFor("/v2/releases/:namespace/:name/values");

    expect(builder.compile({ namespace: "kube-system", name: "coredns" }, { all: "true" })).toBe(
      "/v2/releases/kube-system/coredns/values?all=true",
    );
  });
});
