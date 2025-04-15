/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { IComputedValue } from "mobx";
import React from "react";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import type { CreateHotbar } from "../../../../features/hotbar/storage/common/create-hotbar.injectable";
import createHotbarInjectable from "../../../../features/hotbar/storage/common/create-hotbar.injectable";
import type { Hotbar } from "../../../../features/hotbar/storage/common/hotbar";
import hotbarsInjectable from "../../../../features/hotbar/storage/common/hotbars.injectable";
import hotbarsStateInjectable from "../../../../features/hotbar/storage/common/state.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { ConfirmDialog } from "../../confirm-dialog";
import { renderFor } from "../../test-utils/renderFor";
import { HotbarRemoveCommand } from "../hotbar-remove-command";

describe("<HotbarRemoveCommand />", () => {
  let result: RenderResult;
  let createHotbar: CreateHotbar;
  let hotbars: IComputedValue<Hotbar[]>;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    createHotbar = di.inject(createHotbarInjectable);
    hotbars = di.inject(hotbarsInjectable);

    const hotbarsState = di.inject(hotbarsStateInjectable);
    const defaultHotbar = createHotbar({ name: "default" });
    const nonDefaultHotbar = createHotbar({ name: "non-default" });

    hotbarsState.set(defaultHotbar.id, defaultHotbar);
    hotbarsState.set(nonDefaultHotbar.id, nonDefaultHotbar);

    result = render(
      <>
        <HotbarRemoveCommand />
        <ConfirmDialog />
      </>,
    );
  });

  it("renders w/o errors", () => {
    expect(result.container).toMatchSnapshot();
  });

  it("calls remove if you click on the entry", () => {
    fireEvent.click(result.getByText("1: default"));
    fireEvent.click(result.getByText("Remove Hotbar"));
    expect(hotbars.get().length).toBe(1);
  });
});
