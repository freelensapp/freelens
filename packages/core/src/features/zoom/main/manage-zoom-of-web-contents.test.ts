/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import manageZoomOfWebContentsInjectable from "./manage-zoom-of-web-contents.injectable";

import type { Mock } from "vitest";

import type { UserPreferencesState } from "../../user-preferences/common/state.injectable";
import type { ManageZoomOfWebContents } from "./manage-zoom-of-web-contents.injectable";

class FakeWebContents {
  readonly setZoomFactor: Mock<(factor: number) => void> = vi.fn();
  private readonly navigationListeners: (() => void)[] = [];

  on(event: "did-navigate", listener: () => void) {
    expect(event).toBe("did-navigate");
    this.navigationListeners.push(listener);

    return this;
  }

  navigate() {
    this.navigationListeners.forEach((listener) => listener());
  }
}

describe("zoom of the windows", () => {
  let state: UserPreferencesState;
  let manageZoomOfWebContents: ManageZoomOfWebContents;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    manageZoomOfWebContents = di.inject(manageZoomOfWebContentsInjectable);
  });

  const setZoom = (zoom: number) =>
    runInAction(() => {
      state.zoom = zoom;
    });

  it("opens a window at 100% before the preferences are loaded", () => {
    const webContents = new FakeWebContents();

    manageZoomOfWebContents(webContents);

    expect(webContents.setZoomFactor).toHaveBeenCalledWith(1);
  });

  it("opens a new window at the zoom of the preferences", () => {
    setZoom(125);

    const webContents = new FakeWebContents();

    manageZoomOfWebContents(webContents);

    expect(webContents.setZoomFactor).toHaveBeenLastCalledWith(1.25);
  });

  it("applies a change of the preference to every open window", () => {
    const first = new FakeWebContents();
    const second = new FakeWebContents();

    manageZoomOfWebContents(first);
    manageZoomOfWebContents(second);
    setZoom(80);

    expect(first.setZoomFactor).toHaveBeenLastCalledWith(0.8);
    expect(second.setZoomFactor).toHaveBeenLastCalledWith(0.8);
  });

  it("applies the zoom again after a navigation of the window", () => {
    setZoom(150);

    const webContents = new FakeWebContents();

    manageZoomOfWebContents(webContents);
    webContents.setZoomFactor.mockClear();
    webContents.navigate();

    expect(webContents.setZoomFactor).toHaveBeenCalledWith(1.5);
  });

  it("stops following the preference once the window is closed", () => {
    const webContents = new FakeWebContents();
    const stop = manageZoomOfWebContents(webContents);

    stop();
    webContents.setZoomFactor.mockClear();
    setZoom(200);

    expect(webContents.setZoomFactor).not.toHaveBeenCalled();
  });
});
