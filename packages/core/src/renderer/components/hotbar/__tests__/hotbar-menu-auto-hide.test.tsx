/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";

import { fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { HotbarMenu } from "../hotbar-menu";

import type { RenderResult } from "@testing-library/react";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";

describe("<HotbarMenu /> auto-hide functionality", () => {
  let result: RenderResult;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    userPreferencesState = di.inject(userPreferencesStateInjectable);

    result = render(<HotbarMenu />);
  });

  describe("when auto-hide is disabled", () => {
    beforeEach(() => {
      userPreferencesState.hotbarAutoHide = false;
      result.rerender(<HotbarMenu />);
    });

    it("renders w/o errors", () => {
      expect(result.container).toMatchSnapshot();
    });

    it("should not have autoHide class", () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");
      expect(hotbarMenu).not.toHaveClass("autoHide");
    });

    it("should not have visible class", () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");
      expect(hotbarMenu).not.toHaveClass("visible");
    });
  });

  describe("when auto-hide is enabled", () => {
    beforeEach(() => {
      userPreferencesState.hotbarAutoHide = true;
      result.rerender(<HotbarMenu />);
    });

    it("renders w/o errors", () => {
      expect(result.container).toMatchSnapshot();
    });

    it("should have autoHide class", () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");
      expect(hotbarMenu).toHaveClass("autoHide");
    });

    it("should start hidden (without visible class)", () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");
      expect(hotbarMenu).not.toHaveClass("visible");
    });

    it("should show hotbar when mouse moves to left edge", async () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");

      fireEvent.mouseMove(window, { clientX: 5 });

      await waitFor(() => {
        expect(hotbarMenu).toHaveClass("visible");
      });
    });

    it("should hide hotbar when mouse moves away", async () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");

      // Show first
      fireEvent.mouseMove(window, { clientX: 5 });
      await waitFor(() => expect(hotbarMenu).toHaveClass("visible"));

      // Then hide
      fireEvent.mouseMove(window, { clientX: 100 });

      await waitFor(() => {
        expect(hotbarMenu).not.toHaveClass("visible");
      });
    });

    it("should hide hotbar on mouseLeave event", async () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");

      fireEvent.mouseMove(window, { clientX: 5 });
      await waitFor(() => expect(hotbarMenu).toHaveClass("visible"));

      if (hotbarMenu) {
        fireEvent.mouseLeave(hotbarMenu);
      }

      await waitFor(() => {
        expect(hotbarMenu).not.toHaveClass("visible");
      });
    });

    it("should cleanup event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      result.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("trigger zone interaction", () => {
    let triggerZone: HTMLElement;

    beforeEach(() => {
      userPreferencesState.hotbarAutoHide = true;

      triggerZone = document.createElement("div");
      triggerZone.className = "hotbar-trigger-zone";
      document.body.appendChild(triggerZone);

      result.rerender(<HotbarMenu />);
    });

    afterEach(() => {
      if (triggerZone && triggerZone.parentNode) {
        triggerZone.parentNode.removeChild(triggerZone);
      }
    });

    it("should show hotbar when mouse enters trigger zone", async () => {
      const hotbarMenu = result.container.querySelector(".HotbarMenu");

      fireEvent.mouseEnter(triggerZone);

      await waitFor(() => {
        expect(hotbarMenu).toHaveClass("visible");
      });
    });
  });
});
