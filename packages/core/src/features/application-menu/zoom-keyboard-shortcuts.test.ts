/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { advanceFakeTime, testUsingFakeTime } from "../../test-utils/use-fake-time";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";
import populateApplicationMenuInjectable, {
  getApplicationMenuTemplate,
} from "./main/populate-application-menu.injectable";

import type { MenuItemConstructorOptions } from "electron";
import type { Mock } from "vitest";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("zoom keyboard shortcuts", () => {
  let builder: ApplicationBuilder;
  let viewMenuItems: MenuItemConstructorOptions[];

  beforeEach(async () => {
    testUsingFakeTime();

    const populateApplicationMenuMock: Mock = vi.fn();

    builder = getApplicationBuilder();

    builder.beforeApplicationStart(({ mainDi }) => {
      mainDi.override(populateApplicationMenuInjectable, () => populateApplicationMenuMock);
    });

    await builder.startHidden();

    advanceFakeTime(100);

    const template = getApplicationMenuTemplate(populateApplicationMenuMock.mock.calls[0][0]);

    viewMenuItems = (template.find((menu) => menu.id === "view")?.submenu ?? []) as MenuItemConstructorOptions[];
  });

  const zoomItems = (label: string) => viewMenuItems.filter((item) => item.label === label);

  it("shows exactly one zoom in and one zoom out item in the menu", () => {
    const visible = viewMenuItems.filter((item) => item.visible !== false).map((item) => item.label);

    expect(visible.filter((label) => label === "Zoom In" || label === "Zoom Out")).toEqual(["Zoom In", "Zoom Out"]);
  });

  it("given the shifted plus of the default accelerator is not available, still zooms in", () => {
    const hidden = zoomItems("Zoom In")
      .filter((item) => item.visible === false)
      .map((item) => item.accelerator);

    expect(hidden).toEqual(["CmdOrCtrl+=", "CmdOrCtrl+numadd"]);
  });

  it("zooms out with the minus of the numeric keypad as well", () => {
    const hidden = zoomItems("Zoom Out")
      .filter((item) => item.visible === false)
      .map((item) => item.accelerator);

    expect(hidden).toEqual(["CmdOrCtrl+numsub"]);
  });

  it.each([
    ["zoom-in-with-equals-sign", 110],
    ["zoom-in-with-numpad-plus", 110],
    ["zoom-out-with-numpad-minus", 90],
  ])("changes the zoom with the hidden item %s", async (id, zoom) => {
    await builder.applicationMenu.click("root", "view", id);

    expect(builder.mainDi.inject(userPreferencesStateInjectable).zoom).toBe(zoom);
  });
});
