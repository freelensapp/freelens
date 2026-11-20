/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { Renderer } from "../extension-api";

import type { DiRender } from "../../renderer/components/test-utils/renderFor";

// The badge of an image as an extension renders it, through `Renderer.Component`.
describe("Renderer.Component.ImageReference", () => {
  const { ImageReference } = Renderer.Component;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    render = renderFor(di);
  });

  it("shows the reference, with the digest as its tooltip, under its global class", () => {
    const result = render(
      <ImageReference
        reference="registry.example.com/app:1.0"
        digest="registry.example.com/app@sha256:0123"
        className="some-class"
        data-testid="image"
      />,
    );
    const badge = result.getByTestId("image");

    expect(badge).toHaveTextContent("registry.example.com/app:1.0");
    expect(badge).toHaveClass("ImageReference", "some-class");
    expect(result.getByTestId("tooltip-content-for-image")).toHaveTextContent("registry.example.com/app@sha256:0123");
  });

  it.each([
    ["no", undefined],
    ["an empty", ""],
  ])("has no tooltip with %s digest", (_, digest) => {
    const result = render(
      <ImageReference reference="registry.example.com/app:1.0" digest={digest} data-testid="image" />,
    );

    expect(result.getByTestId("image")).toHaveTextContent("registry.example.com/app:1.0");
    expect(result.queryByTestId("tooltip-content-for-image")).not.toBeInTheDocument();
  });
});
