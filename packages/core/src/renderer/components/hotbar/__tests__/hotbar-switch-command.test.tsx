import React from "react";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import createHotbarInjectable, {
  type CreateHotbar,
} from "../../../../features/hotbar/storage/common/create-hotbar.injectable";
import hotbarsInjectable from "../../../../features/hotbar/storage/common/hotbars.injectable";
import hotbarsStateInjectable from "../../../../features/hotbar/storage/common/state.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { HotbarSwitchCommand } from "../hotbar-switch-command";

import type { RenderResult } from "@testing-library/react";
import type { IComputedValue } from "mobx";

import type { Hotbar } from "../../../../features/hotbar/storage/common/hotbar";

describe("when there is one hotbar", () => {
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

    hotbarsState.set(defaultHotbar.id, defaultHotbar);

    result = render(<HotbarSwitchCommand />);
  });

  it("renders w/o errors", () => {
    expect(result.container).toMatchSnapshot();
  });

  it("'Remove hotbar ...' must not be present", () => {
    expect(hotbars.get().length).toBe(1);
    expect(result.queryByText("Remove hotbar ...")).not.toBeInTheDocument();
  });
});

describe("when there are two hotbars", () => {
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

    result = render(<HotbarSwitchCommand />);
  });

  it("renders w/o errors", () => {
    expect(result.container).toMatchSnapshot();
  });

  it("'Remove hotbar ...' must be present", () => {
    expect(hotbars.get().length).toBe(2);
    expect(result.queryByText("Remove hotbar ...")).toBeInTheDocument();
  });
});
