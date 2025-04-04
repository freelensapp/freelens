/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type RenderResult } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("hovering hotbar menu tests", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let user: UserEvent;

  beforeEach(async () => {
    builder = getApplicationBuilder();

    result = await builder.render();

    user = userEvent.setup({delay: null});
  });

  it("renders", () => {
    expect(result.baseElement).toMatchSnapshot();
  });

  it("should not yet render the hotbar name", () => {
    expect(result.queryByText("hotbar-menu-badge-tooltip-for-default")).not.toBeInTheDocument();
  });

  describe.skip("when hovering over the hotbar menu", () => {
    beforeEach(async () => {
      await user.hover(result.getByTestId("hotbar-menu-badge-for-Default"));
    });

    it("renders", () => {
      expect(result.baseElement).toMatchSnapshot();
    });

    it("should render the hotbar name", () => {
      expect(result.getByTestId("hotbar-menu-badge-tooltip-for-Default")).toBeInTheDocument();
    });
  });
});
