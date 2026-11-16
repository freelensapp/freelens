/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import * as selectEvent from "react-select-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import userPreferenceDescriptorsInjectable from "../../../../../../user-preferences/common/preference-descriptors.injectable";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { zoomSteps } from "../../../../../../zoom/common/zoom-steps";
import { Zoom } from "../zoom";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

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

  const getInput = () => container.querySelector("#zoom-input") as HTMLElement;

  it("shows 100% by default", () => {
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  const findOption = (label: string) => screen.findByText(label, { selector: ".Select__option" });

  it("offers every step, in order", async () => {
    selectEvent.openMenu(getInput());
    await findOption("100%");

    expect(Array.from(document.querySelectorAll(".Select__option"), (option) => option.textContent)).toEqual(
      zoomSteps.map((step) => `${step}%`),
    );
  });

  it.each(zoomSteps)("sets %i%", async (step) => {
    selectEvent.openMenu(getInput());
    await user.click(await findOption(`${step}%`));

    expect(state.zoom).toBe(step);
  });

  it("shows a zoom changed elsewhere, such as from the menu", async () => {
    runInAction(() => {
      state.zoom = 150;
    });

    expect(await screen.findByText("150%", { selector: ".Select__single-value" })).toBeInTheDocument();
  });
});
