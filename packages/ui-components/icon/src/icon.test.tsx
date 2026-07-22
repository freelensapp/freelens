/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { registerFeature } from "@freelensapp/feature-core";
import { loggerFeature, loggerInjectionToken } from "@freelensapp/logger";
import { renderFor } from "@freelensapp/test-utils";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { runInAction } from "mobx";
import { Icon } from "./icon";

import type { Logger } from "@freelensapp/logger";
import type { DiRender } from "@freelensapp/test-utils";

import type { MockedObject } from "vitest";

describe("<Icon> href technical tests", () => {
  let render: DiRender;
  let logger: MockedObject<Logger>;

  beforeEach(() => {
    const environment = "renderer";
    const di = createContainer(environment);

    registerMobX(di);

    runInAction(() => {
      registerFeature(di, loggerFeature);
    });

    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
      warn: vi.fn(),
    };

    di.override(loggerInjectionToken, () => logger);

    render = renderFor(di);
  });

  it("should render an <Icon> with http href", () => {
    const result = render(<Icon data-testid="my-icon" href="http://localhost" />);

    const icon = result.queryByTestId("my-icon");

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("href", "http://localhost");
    expect(logger.warn).not.toBeCalled();
  });

  it("should render an <Icon> with https href", () => {
    const result = render(<Icon data-testid="my-icon" href="https://localhost" />);

    const icon = result.queryByTestId("my-icon");

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("href", "https://localhost");
    expect(logger.warn).not.toBeCalled();
  });

  it("should warn about ws hrefs", () => {
    const result = render(<Icon data-testid="my-icon" href="ws://localhost" />);

    const icon = result.queryByTestId("my-icon");

    expect(icon).toBeInTheDocument();
    expect(icon).not.toHaveAttribute("href", "ws://localhost");
    expect(logger.warn).toBeCalled();
  });

  it("should warn about javascript: hrefs", () => {
    const result = render(<Icon data-testid="my-icon" href="#" />);

    const icon = result.queryByTestId("my-icon");

    expect(icon).toBeInTheDocument();
    expect(icon).not.toHaveAttribute("href", "#");
    expect(logger.warn).toBeCalled();
  });
});
