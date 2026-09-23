/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { contentTypeForFile, extensionFileUrl, parseExtensionFileUrl, toFileSegments } from "./scheme";

describe("extension scheme URLs", () => {
  it("puts the extension in the path of the one origin", () => {
    expect(
      extensionFileUrl({
        sanitizedName: "freelensapp--helloworld",
        buildSegment: "1.0.0-0f1e2d3c",
        fileSegments: ["dist", "renderer.js"],
      }),
    ).toBe("freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/renderer.js");
  });

  it("round-trips through parsing", () => {
    const request = {
      sanitizedName: "freelensapp--helloworld",
      buildSegment: "dev-a-token",
      fileSegments: ["out", "renderer", "index.js"],
    };

    expect(parseExtensionFileUrl(extensionFileUrl(request))).toEqual(request);
  });

  it("normalises a manifest path into segments", () => {
    expect(toFileSegments("./dist/renderer.js")).toEqual(["dist", "renderer.js"]);
    expect(toFileSegments("dist\\renderer.js")).toEqual(["dist", "renderer.js"]);
  });

  describe("parsing", () => {
    it("refuses another scheme or another host", () => {
      expect(parseExtensionFileUrl("https://extensions/an-extension/1.0.0-0f1e2d3c/index.js")).toBeUndefined();
      expect(
        parseExtensionFileUrl("freelens-extension://elsewhere/an-extension/1.0.0-0f1e2d3c/index.js"),
      ).toBeUndefined();
    });

    it("refuses a URL naming no file", () => {
      expect(parseExtensionFileUrl("freelens-extension://extensions/an-extension/1.0.0-0f1e2d3c")).toBeUndefined();
      expect(parseExtensionFileUrl("freelens-extension://extensions/an-extension")).toBeUndefined();
    });

    it("refuses a traversal segment, encoded or not", () => {
      expect(parseExtensionFileUrl("freelens-extension://extensions/an-ext/1.0.0-0f1e2d3c/../secret")).toBeUndefined();
      expect(
        parseExtensionFileUrl("freelens-extension://extensions/an-ext/1.0.0-0f1e2d3c/%2e%2e/secret"),
      ).toBeUndefined();
    });

    it("refuses a separator smuggled through percent-encoding", () => {
      expect(
        parseExtensionFileUrl("freelens-extension://extensions/an-ext/1.0.0-0f1e2d3c/dist%2f..%2fsecret"),
      ).toBeUndefined();
    });

    it("keeps the dots and underscores npm package names allow", () => {
      expect(parseExtensionFileUrl("freelens-extension://extensions/some.ext_name/1.0.0-0f1e2d3c/i.js")).toEqual({
        sanitizedName: "some.ext_name",
        buildSegment: "1.0.0-0f1e2d3c",
        fileSegments: ["i.js"],
      });
    });
  });

  describe("content types", () => {
    it.each([
      ["renderer.js", "text/javascript; charset=utf-8"],
      ["renderer.mjs", "text/javascript; charset=utf-8"],
      ["style.CSS", "text/css; charset=utf-8"],
      ["module.wasm", "application/wasm"],
    ])("serves %s as %s", (fileName, expected) => {
      expect(contentTypeForFile(fileName)).toBe(expected);
    });

    it("refuses to guess, so an unknown type cannot execute", () => {
      expect(contentTypeForFile("binary.node")).toBe("application/octet-stream");
      expect(contentTypeForFile("LICENSE")).toBe("application/octet-stream");
    });
  });
});
