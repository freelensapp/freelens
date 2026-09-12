/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { advanceFakeTime, testUsingFakeTime } from "../../test-utils/use-fake-time";
import populateApplicationMenuInjectable, {
  getApplicationMenuTemplate,
} from "./main/populate-application-menu.injectable";

import type { MenuItemConstructorOptions } from "electron";
import type { Mock } from "vitest";

describe("zoom keyboard shortcuts", () => {
  let viewMenuItems: MenuItemConstructorOptions[];

  beforeEach(async () => {
    testUsingFakeTime();

    const populateApplicationMenuMock: Mock = vi.fn();
    const builder = getApplicationBuilder();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(populateApplicationMenuInjectable, () => populateApplicationMenuMock);
    });

    await builder.startHidden();

    advanceFakeTime(100);

    const template = getApplicationMenuTemplate(populateApplicationMenuMock.mock.calls[0][0]);

    viewMenuItems = template.find((menu) => menu.id === "view")?.submenu ?? [];
  });

  it("shows exactly one zoom in and one zoom out item in the menu", () => {
    const visibleZoomItems = viewMenuItems.filter((item) => item.visible !== false).map((item) => item.role);

    expect(visibleZoomItems.filter((role) => role === "zoomIn" || role === "zoomOut")).toEqual(["zoomIn", "zoomOut"]);
  });

  it("given the shifted plus of the default accelerator is not available, still zooms in", () => {
    const hiddenZoomInShortcuts = viewMenuItems
      .filter((item) => item.role === "zoomIn" && item.visible === false)
      .map((item) => item.accelerator);

    expect(hiddenZoomInShortcuts).toEqual(["CommandOrControl+=", "CommandOrControl+numadd"]);
  });

  it("zooms out with the minus of the numeric keypad as well", () => {
    const hiddenZoomOutShortcuts = viewMenuItems
      .filter((item) => item.role === "zoomOut" && item.visible === false)
      .map((item) => item.accelerator);

    expect(hiddenZoomOutShortcuts).toEqual(["CommandOrControl+numsub"]);
  });
});
