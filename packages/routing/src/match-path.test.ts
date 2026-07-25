/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { matchPath } from "./match-path";

describe("matchPath", () => {
  describe("options normalization", () => {
    it("accepts a bare path string", () => {
      const match = matchPath("/catalog", "/catalog");

      expect(match).not.toBeNull();
      expect(match?.path).toBe("/catalog");
      expect(match?.url).toBe("/catalog");
    });

    it("accepts an array of paths and returns the first match", () => {
      const match = matchPath("/helm/releases", ["/catalog", "/helm/releases"]);

      expect(match?.path).toBe("/helm/releases");
    });

    it("returns null when no path in the array matches", () => {
      expect(matchPath("/nowhere", ["/catalog", "/helm"])).toBeNull();
    });

    it("returns null when the options have no path", () => {
      expect(matchPath("/catalog", {})).toBeNull();
    });
  });

  describe("exact matching", () => {
    it("matches non-exactly by default (prefix match)", () => {
      const match = matchPath("/preferences/app", { path: "/preferences" });

      expect(match).not.toBeNull();
      expect(match?.isExact).toBe(false);
      expect(match?.url).toBe("/preferences");
    });

    it("rejects a prefix match when exact is required", () => {
      expect(matchPath("/preferences/app", { path: "/preferences", exact: true })).toBeNull();
    });

    it("reports isExact for a full match", () => {
      const match = matchPath("/preferences", { path: "/preferences", exact: true });

      expect(match?.isExact).toBe(true);
    });
  });

  describe("path parameters", () => {
    it("parses required parameters", () => {
      const match = matchPath<{ namespace?: string; name?: string }>("/helm/releases/kube-system/coredns", {
        path: "/helm/releases/:namespace?/:name?",
        exact: true,
      });

      expect(match?.params).toEqual({ namespace: "kube-system", name: "coredns" });
    });

    it("leaves omitted optional parameters undefined", () => {
      const match = matchPath<{ group?: string; kind?: string }>("/catalog", {
        path: "/catalog/:group?/:kind?",
        exact: true,
      });

      expect(match?.isExact).toBe(true);
      expect(match?.params).toEqual({ group: undefined, kind: undefined });
    });

    it("parses a partially-provided set of optional parameters", () => {
      const match = matchPath<{ group?: string; kind?: string }>("/catalog/apps", {
        path: "/catalog/:group?/:kind?",
        exact: true,
      });

      expect(match?.params).toEqual({ group: "apps", kind: undefined });
    });

    it("parses a required parameter followed by an optional one", () => {
      const match = matchPath<{ extensionId?: string; preferenceTabId?: string }>(
        "/preferences/extension/my-extension/general",
        { path: "/preferences/extension/:extensionId/:preferenceTabId?", exact: true },
      );

      expect(match?.params).toEqual({ extensionId: "my-extension", preferenceTabId: "general" });
    });
  });

  describe("inline custom patterns (react-router v5 / path-to-regexp v1 dialect)", () => {
    // Mirrors LensProtocolRouter.ExtensionUrlSchema, which relies on an inline
    // regex the workspace's path-to-regexp v8 cannot express.
    const schema = "/:publisher(@[A-Za-z0-9_]+)?/:name";

    it("matches with the optional publisher segment present", () => {
      const match = matchPath<{ publisher?: string; name?: string }>("/@freelensapp/my-extension", schema);

      expect(match?.params).toEqual({ publisher: "@freelensapp", name: "my-extension" });
    });

    it("matches without the optional publisher segment", () => {
      const match = matchPath<{ publisher?: string; name?: string }>("/my-extension", schema);

      expect(match?.params.publisher).toBeUndefined();
      expect(match?.params.name).toBe("my-extension");
    });

    it("does not capture a segment that fails the inline pattern as the publisher", () => {
      const match = matchPath<{ publisher?: string; name?: string }>("/not-a-publisher/my-extension", schema);

      // "not-a-publisher" lacks the leading "@", so it cannot fill the publisher slot.
      expect(match?.params.publisher).toBeUndefined();
    });
  });

  describe("match metadata", () => {
    it("reports the matched url and non-exact tail for a prefix match", () => {
      const match = matchPath("/port-forwards/8080/extra", { path: "/port-forwards/:forwardport?" });

      expect(match?.url).toBe("/port-forwards/8080");
      expect(match?.isExact).toBe(false);
    });

    it("matches the root path", () => {
      const match = matchPath("/", { path: "/", exact: true });

      expect(match?.isExact).toBe(true);
      expect(match?.url).toBe("/");
    });

    it("is case insensitive by default and case sensitive when requested", () => {
      expect(matchPath("/Catalog", { path: "/catalog", exact: true })).not.toBeNull();
      expect(matchPath("/Catalog", { path: "/catalog", exact: true, sensitive: true })).toBeNull();
    });
  });

  describe("caching", () => {
    it("returns consistent results across repeated calls for the same pattern", () => {
      const first = matchPath("/catalog/apps", { path: "/catalog/:group?/:kind?", exact: true });
      const second = matchPath("/catalog/apps", { path: "/catalog/:group?/:kind?", exact: true });

      expect(first).toEqual(second);
    });
  });
});
