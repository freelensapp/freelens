/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import navigateToWorkloadsOverviewInjectable from "../../common/front-end-routing/routes/cluster/workloads/overview/navigate-to-workloads-overview.injectable";
import {
  type ApplicationBuilder,
  getApplicationBuilder,
} from "../../renderer/components/test-utils/get-application-builder";
import currentPathInjectable from "../../renderer/routes/current-path.injectable";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";

import type { RenderResult } from "@testing-library/react";

describe("workload overview", () => {
  let rendered: RenderResult;
  let builder: ApplicationBuilder;

  beforeEach(async () => {
    builder = getApplicationBuilder().setEnvironmentToClusterFrame();

    builder.afterWindowStart(() => {
      builder.allowKubeResource({
        apiName: "pods",
        group: "",
      });
    });

    rendered = await builder.render();
  });

  const getUserPreferences = () => builder.applicationWindow.only.di.inject(userPreferencesStateInjectable);

  describe("when navigating to workload overview", () => {
    beforeEach(() => {
      builder.navigateWith(navigateToWorkloadsOverviewInjectable);
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("shows workload overview", () => {
      expect(rendered.queryByTestId("page-for-workloads-overview")).toBeInTheDocument();
    });

    it("shows a status card for pods", () => {
      expect(rendered.queryByTestId("workload-status-card-pods")).toBeInTheDocument();
    });

    it("does not show the pods pie chart", () => {
      expect(rendered.queryByTestId("workload-overview-status-chart-pods")).not.toBeInTheDocument();
    });

    it("says there are no pods in the namespace", () => {
      expect(rendered.getByTestId("workload-status-card-pods-empty")).toHaveTextContent("None in this namespace");
    });

    it("opens the list of pods from the card", () => {
      fireEvent.click(rendered.getByTestId("workload-status-card-pods"));

      expect(builder.applicationWindow.only.di.inject(currentPathInjectable).get()).toBe("/pods");
    });

    describe("when the overview style changes to charts", () => {
      beforeEach(() => {
        act(() => {
          getUserPreferences().overviewStyle = "charts";
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("shows pods pie chart", () => {
        expect(rendered.queryByTestId("workload-overview-status-chart-pods")).toBeInTheDocument();
      });

      it("does not show the status cards", () => {
        expect(rendered.queryByTestId("workload-status-card-pods")).not.toBeInTheDocument();
      });

      it("shows the status cards again when the style changes back to cards", () => {
        act(() => {
          getUserPreferences().overviewStyle = "cards";
        });

        expect(rendered.queryByTestId("workload-status-card-pods")).toBeInTheDocument();
        expect(rendered.queryByTestId("workload-overview-status-chart-pods")).not.toBeInTheDocument();
      });
    });
  });
});
