/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import userPreferenceDescriptorsInjectable from "../../../../../../user-preferences/common/preference-descriptors.injectable";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { zoomSteps } from "../../../../../../zoom/common/zoom-steps";
import { Zoom } from "../zoom";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

const firstStep = zoomSteps[0];
const lastStep = zoomSteps[zoomSteps.length - 1];

describe("zoom preference", () => {
  let state: UserPreferencesState;
  let container: HTMLElement;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    user = userEvent.setup();
    runInAction(() => {
      state.zoom = di.inject(userPreferenceDescriptorsInjectable).zoom.fromStore(undefined);
    });
    ({ container } = renderFor(di)(<Zoom />));
  });

  const getSlider = () => screen.getByRole("slider");
  const getShownZoom = () => screen.getByTestId("zoom-value").textContent;
  const getReset = () => screen.getByTestId("zoom-reset");
  // As the View menu does: the preference changes outside the control.
  const setZoom = (zoom: number) =>
    act(() =>
      runInAction(() => {
        state.zoom = zoom;
      }),
    );

  it("shows 100% by default", () => {
    expect(getSlider()).toHaveAttribute("aria-valuenow", "100");
    expect(getShownZoom()).toBe("100%");
  });

  it("spans the steps, with a mark at each and only 100% labelled", () => {
    expect(getSlider()).toHaveAttribute("aria-valuemin", String(firstStep));
    expect(getSlider()).toHaveAttribute("aria-valuemax", String(lastStep));
    expect(container.querySelectorAll(".Slider .mark")).toHaveLength(zoomSteps.length);
    expect(Array.from(container.querySelectorAll(".Slider .markLabel"), (label) => label.textContent)).toEqual([
      "100%",
    ]);
  });

  it("steps up through every step with the arrow keys, and stays at the last", async () => {
    setZoom(firstStep);
    getSlider().focus();

    for (const step of zoomSteps.slice(1)) {
      await user.keyboard("{ArrowRight}");
      expect(state.zoom).toBe(step);
      expect(getShownZoom()).toBe(`${step}%`);
    }

    await user.keyboard("{ArrowUp}");
    expect(state.zoom).toBe(lastStep);
  });

  it("steps down through every step with the arrow keys, and stays at the first", async () => {
    setZoom(lastStep);
    getSlider().focus();

    for (const step of zoomSteps.toReversed().slice(1)) {
      await user.keyboard("{ArrowLeft}");
      expect(state.zoom).toBe(step);
    }

    await user.keyboard("{ArrowDown}");
    expect(state.zoom).toBe(firstStep);
  });

  describe("when the thumb is dragged", () => {
    // The track is as many pixels wide as the range has percents, so a pixel is a percent.
    const toClientX = (zoom: number) => zoom - firstStep;

    beforeEach(() => {
      const root = container.querySelector(".Slider") as HTMLElement;

      vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
        left: 0,
        right: lastStep - firstStep,
        width: lastStep - firstStep,
        top: 0,
        bottom: 10,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      // jsdom has no pointer capture.
      Object.assign(root, {
        setPointerCapture: () => {},
        hasPointerCapture: () => false,
        releasePointerCapture: () => {},
      });

      fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: toClientX(100) });
      fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: toClientX(150) });
    });

    it("shows the percentage under the thumb", () => {
      expect(getShownZoom()).toBe("150%");
      expect(getSlider()).toHaveAttribute("aria-valuenow", "150");
    });

    it("does not zoom yet", () => {
      expect(state.zoom).toBe(100);
    });

    it("snaps to the nearest step", () => {
      fireEvent.pointerMove(document, { pointerId: 1, buttons: 1, clientX: toClientX(130) });

      expect(getShownZoom()).toBe("125%");
    });

    it("zooms on release", () => {
      fireEvent.pointerUp(document, { pointerId: 1, buttons: 0, clientX: toClientX(150) });

      expect(state.zoom).toBe(150);
      expect(getShownZoom()).toBe("150%");
    });
  });

  it("disables Reset at 100%", () => {
    expect(getReset()).toBeDisabled();
  });

  it.each(zoomSteps.filter((step) => step !== 100))("resets %i% to 100%", async (step) => {
    setZoom(step);
    await user.click(getReset());

    expect(state.zoom).toBe(100);
    expect(getShownZoom()).toBe("100%");
    expect(getReset()).toBeDisabled();
  });

  it("shows a zoom changed elsewhere, such as from the menu", () => {
    setZoom(150);

    expect(getShownZoom()).toBe("150%");
    expect(getSlider()).toHaveAttribute("aria-valuenow", "150");
  });
});
