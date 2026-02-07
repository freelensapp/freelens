/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import navigateToFavoritesOverviewInjectable from "../../common/front-end-routing/routes/cluster/favorites/overview/navigate-to-favorites-overview.injectable";
import {
  type ApplicationBuilder,
  getApplicationBuilder,
} from "../../renderer/components/test-utils/get-application-builder";

import type { RenderResult } from "@testing-library/react";

describe("favorites overview", () => {
  let rendered: RenderResult;
  let builder: ApplicationBuilder;

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();

    rendered = await builder.render();
  });

  describe("when navigating to favorites overview", () => {
    beforeEach(() => {
      builder.navigateWith(navigateToFavoritesOverviewInjectable);
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("shows favorites overview page", () => {
      expect(rendered.queryByTestId("page-for-favorites-overview")).toBeInTheDocument();
    });

    it("shows empty state message", () => {
      expect(rendered.queryByText("No favorites yet")).toBeInTheDocument();
    });
  });
});
