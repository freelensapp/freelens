/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";

import { act, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import activeHotbarIdInjectable from "../../../../features/hotbar/storage/common/active-id.injectable";
import { Hotbar } from "../../../../features/hotbar/storage/common/hotbar";
import hotbarsStateInjectable from "../../../../features/hotbar/storage/common/state.injectable";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { HotbarMenu } from "../hotbar-menu";

import type { RenderResult } from "@testing-library/react";
import type { IObservableValue, ObservableMap } from "mobx";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";
import type { CatalogEntityRegistry } from "../../../api/catalog/entity/registry";

describe("<HotbarMenu /> auto-hide functionality", () => {
  let result: RenderResult;
  let activeHotbarId: IObservableValue<string | undefined>;
  let entityRegistry: CatalogEntityRegistry;
  let hotbarsState: ObservableMap<string, Hotbar>;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    activeHotbarId = di.inject(activeHotbarIdInjectable);
    entityRegistry = di.inject(catalogEntityRegistryInjectable);
    hotbarsState = di.inject(hotbarsStateInjectable);
    userPreferencesState = di.inject(userPreferencesStateInjectable);

    result = render(<HotbarMenu />);
  });

  it("renders items added after mounting", async () => {
    const hotbar = new Hotbar({ name: "Default" });

    act(() => {
      hotbarsState.set(hotbar.id, hotbar);
      activeHotbarId.set(hotbar.id);
    });

    await waitFor(() => {
      expect(result.container.querySelectorAll(".HotbarItem")).toHaveLength(0);
    });

    act(() => {
      hotbar.items.push({
        entity: {
          uid: "new-item",
          name: "New item",
        },
      });
    });

    await waitFor(() => {
      expect(result.container.querySelectorAll(".HotbarItem")).toHaveLength(1);
    });
  });

  it("resolves persisted items when catalog entities load after mounting", async () => {
    const hotbar = new Hotbar({ name: "Default" });

    hotbar.items.push({
      entity: {
        uid: "delayed-item",
        name: "Delayed item",
      },
    });

    act(() => {
      hotbarsState.set(hotbar.id, hotbar);
      activeHotbarId.set(hotbar.id);
    });

    await waitFor(() => {
      expect(result.container.querySelector("#hotbarIcon-hotbar-icon-delayed-item")).toBeInTheDocument();
    });

    act(() => {
      entityRegistry.updateItems([
        {
          apiVersion: "entity.k8slens.dev/v1alpha1",
          kind: "WebLink",
          metadata: {
            uid: "delayed-item",
            name: "Delayed item",
            source: "test",
            labels: {},
          },
          spec: {
            url: "https://freelens.app",
          },
          status: {
            phase: "available",
          },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.container.querySelector("#hotbarIcon-delayed-item")).toBeInTheDocument();
    });
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

    it("does not render empty item placeholders", () => {
      expect(result.container.querySelector(".HotbarCell")).not.toBeInTheDocument();
      expect(result.container.querySelector(".HotbarItem")).not.toBeInTheDocument();
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
