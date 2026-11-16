/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { testUsingFakeTime } from "../../test-utils/use-fake-time";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { UserPreferencesState } from "../user-preferences/common/state.injectable";

describe("zoom using the application menu", () => {
  let builder: ApplicationBuilder;
  let state: UserPreferencesState;

  beforeEach(async () => {
    testUsingFakeTime("2015-10-21T07:28:00Z");

    builder = getApplicationBuilder();
    await builder.render();

    state = builder.mainDi.inject(userPreferencesStateInjectable);
  });

  const setZoom = (zoom: number) =>
    runInAction(() => {
      state.zoom = zoom;
    });

  it("starts at 100%", () => {
    expect(state.zoom).toBe(100);
  });

  it("zooms in to the next step", async () => {
    await builder.applicationMenu.click("root", "view", "zoom-in");

    expect(state.zoom).toBe(110);
  });

  it("zooms out to the previous step", async () => {
    await builder.applicationMenu.click("root", "view", "zoom-out");

    expect(state.zoom).toBe(90);
  });

  it("stays at the last step when zooming in", async () => {
    setZoom(200);

    await builder.applicationMenu.click("root", "view", "zoom-in");

    expect(state.zoom).toBe(200);
  });

  it("stays at the first step when zooming out", async () => {
    setZoom(67);

    await builder.applicationMenu.click("root", "view", "zoom-out");

    expect(state.zoom).toBe(67);
  });

  it("resets the zoom to 100%", async () => {
    setZoom(175);

    await builder.applicationMenu.click("root", "view", "reset-zoom");

    expect(state.zoom).toBe(100);
  });

  it("passes a zoom chosen from the menu on to the renderer", async () => {
    await builder.applicationMenu.click("root", "view", "zoom-in");

    expect(builder.applicationWindow.only.di.inject(userPreferencesStateInjectable).zoom).toBe(110);
  });
});
