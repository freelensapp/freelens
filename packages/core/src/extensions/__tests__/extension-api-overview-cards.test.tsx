/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observer } from "mobx-react";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import {
  CapacityCard as HostCapacityCard,
  StatusCard as HostStatusCard,
} from "../../renderer/components/overview-cards";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { Common, Renderer } from "../extension-api";

import type { DiContainer } from "@ogre-tools/injectable";

import type { UserPreferencesState } from "../../features/user-preferences/common/state.injectable";
import type { DiRender } from "../../renderer/components/test-utils/renderFor";

// The overview cards as an extension sees them: the host's own components, rendered from props alone,
// and the user's choice between cards and charts, which an extension follows reactively.
describe("overview cards in the extension API", () => {
  let di: DiContainer;
  let render: DiRender;
  let state: UserPreferencesState;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
    state = di.inject(userPreferencesStateInjectable);
  });

  describe("Renderer.Component", () => {
    it("exports the cards the overviews render", () => {
      expect(Renderer.Component.CapacityCard).toBe(HostCapacityCard);
      expect(Renderer.Component.StatusCard).toBe(HostStatusCard);
    });

    it("renders a capacity card from the values of an extension", () => {
      const { CapacityCard } = Renderer.Component;

      render(
        <CapacityCard
          title="GPU"
          usage={3}
          requests={4}
          limits={10}
          allocatable={8}
          unit="GPUs"
          labels={{ usage: "Busy" }}
          data-testid="gpu"
        />,
      );

      expect(screen.getByTestId("gpu")).toHaveClass("CapacityCard");
      expect(screen.getByTestId("gpu-percent")).toHaveTextContent("38%");
      expect(screen.getByText("Busy")).toBeInTheDocument();
      expect(screen.getByTestId("gpu-overcommit")).toHaveTextContent("Limits 1.3× Allocatable");
    });

    it("renders a status card from the statuses of an extension", async () => {
      const { StatusCard } = Renderer.Component;
      const onClick = vi.fn();

      render(
        <StatusCard
          title="Releases"
          statuses={[
            { label: "Ready", count: 3, color: "var(--colorOk)", tone: "healthy" },
            { label: "Stalled", count: 1, color: "var(--colorError)", tone: "failing" },
          ]}
          onClick={onClick}
          data-testid="releases"
        />,
      );

      expect(screen.getByTestId("releases")).toHaveClass("StatusCard");
      expect(screen.getByTestId("releases-total")).toHaveTextContent("4");
      expect(screen.getByText("75% healthy")).toBeInTheDocument();
      expect(screen.getByTestId("releases-failing")).toHaveTextContent("1 failing");

      await userEvent.click(screen.getByRole("button", { name: /^Releases/ }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Common.App.Preferences.getOverviewStyle()", () => {
    it("is charts when the user has not chosen", () => {
      expect(Common.App.Preferences.getOverviewStyle()).toBe("charts");
    });

    it("is the style the user chose", () => {
      state.overviewStyle = "cards";

      expect(Common.App.Preferences.getOverviewStyle()).toBe("cards");
    });

    it("renders an observer again when the user switches", () => {
      const Overview = observer(() => <div data-testid="overview">{Common.App.Preferences.getOverviewStyle()}</div>);

      render(<Overview />);

      expect(screen.getByTestId("overview")).toHaveTextContent("charts");

      act(() => {
        state.overviewStyle = "cards";
      });

      expect(screen.getByTestId("overview")).toHaveTextContent("cards");

      act(() => {
        state.overviewStyle = "charts";
      });

      expect(screen.getByTestId("overview")).toHaveTextContent("charts");
    });
  });
});
