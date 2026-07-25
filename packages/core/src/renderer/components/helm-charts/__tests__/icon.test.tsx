/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, render, screen } from "@testing-library/react";
import { HelmChartIcon } from "../icon";

const mainImageSrc = "https://example.com/main-picture.jpg";
const mainPngImageSrc = "https://example.com/main-picture.png";
const invalidImageSrc = "file://invalid-image-url.png";
const svgImageSrc = "https://example.com/main-picture.svg";

describe("HelmChartIcon", () => {
  it("renders the placeholder image by default", () => {
    render(<HelmChartIcon />);
    const imageContainer = screen.getByTestId("image-container");

    expect(imageContainer.style.backgroundImage).toContain("data:image/svg+xml");
  });

  // The <img> is decorative (alt=""), so its ARIA role is "presentation", not
  // "img" (testing-library 15 / dom-accessibility-api computes this correctly).
  // Query the element by tag within the container instead of by role.
  it("renders img tag when image url is valid", () => {
    render(<HelmChartIcon imageUrl={mainImageSrc} />);
    const mainImage = screen.getByTestId("image-container").querySelector("img");

    expect(mainImage).toBeInTheDocument();
  });

  it("renders jpg image when its loaded", () => {
    render(<HelmChartIcon imageUrl={mainImageSrc} />);

    const imageContainer = screen.getByTestId("image-container");
    const mainImage = imageContainer.querySelector("img");

    act(() => {
      mainImage?.dispatchEvent(new Event("load"));
    });
    expect(imageContainer.style.backgroundImage).toBe('url("https://example.com/main-picture.jpg")');
  });

  it("renders png image when its loaded", () => {
    render(<HelmChartIcon imageUrl={mainPngImageSrc} />);

    const imageContainer = screen.getByTestId("image-container");
    const mainImage = imageContainer.querySelector("img");

    act(() => {
      mainImage?.dispatchEvent(new Event("load"));
    });
    expect(imageContainer.style.backgroundImage).toBe('url("https://example.com/main-picture.png")');
  });

  it("does not render invalid image url", () => {
    render(<HelmChartIcon imageUrl={invalidImageSrc} />);

    const mainImage = screen.getByTestId("image-container").querySelector("img");

    expect(mainImage).not.toBeInTheDocument();
  });

  it("does not render svg image", () => {
    render(<HelmChartIcon imageUrl={svgImageSrc} />);

    const mainImage = screen.getByTestId("image-container").querySelector("img");

    expect(mainImage).not.toBeInTheDocument();
  });
});
