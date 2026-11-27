/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { filterNodeImages, getNodeImageName, getNodeImages } from "./node-images";

const nginx = {
  names: ["docker.io/library/nginx@sha256:0123", "docker.io/library/nginx:1.27"],
  sizeBytes: 72_000_000,
};
const pause = { names: ["registry.k8s.io/pause@sha256:4567"], sizeBytes: 300_000 };

describe("getNodeImages", () => {
  it("splits the names of each image into tags and digests", () => {
    expect(getNodeImages([nginx, pause])).toEqual([
      {
        tags: ["docker.io/library/nginx:1.27"],
        digests: ["docker.io/library/nginx@sha256:0123"],
        sizeBytes: 72_000_000,
      },
      { tags: [], digests: ["registry.k8s.io/pause@sha256:4567"], sizeBytes: 300_000 },
    ]);
  });

  it.each([
    ["no list", undefined],
    ["an empty list", []],
  ])("returns no images for %s", (_, images) => {
    expect(getNodeImages(images)).toEqual([]);
  });

  it("keeps an image that has no names", () => {
    expect(getNodeImages([{ sizeBytes: 10 }])).toEqual([{ tags: [], digests: [], sizeBytes: 10 }]);
  });
});

describe("filterNodeImages", () => {
  const images = getNodeImages([nginx, pause]);

  it("keeps every image for an empty or blank search", () => {
    expect(filterNodeImages(images, "")).toEqual(images);
    expect(filterNodeImages(images, "   ")).toEqual(images);
  });

  it("matches a tag, ignoring case", () => {
    expect(filterNodeImages(images, "NGINX:1.27").map(getNodeImageName)).toEqual(["docker.io/library/nginx:1.27"]);
  });

  it("matches a digest", () => {
    expect(filterNodeImages(images, "sha256:4567").map(getNodeImageName)).toEqual([
      "registry.k8s.io/pause@sha256:4567",
    ]);
  });

  it("returns no images when nothing matches", () => {
    expect(filterNodeImages(images, "redis")).toEqual([]);
  });
});

describe("getNodeImageName", () => {
  it("is the first tag, the first digest without a tag, and empty without names", () => {
    const [withTag, withDigestOnly] = getNodeImages([nginx, pause]);

    expect(getNodeImageName(withTag)).toBe("docker.io/library/nginx:1.27");
    expect(getNodeImageName(withDigestOnly)).toBe("registry.k8s.io/pause@sha256:4567");
    expect(getNodeImageName({ tags: [], digests: [] })).toBe("");
  });
});
