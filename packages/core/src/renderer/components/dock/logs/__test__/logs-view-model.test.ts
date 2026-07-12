/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { createMockLogTabViewModel, getDefaultOnePodLogTabData } from "./test-utils";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";

describe("LogTabViewModel", () => {
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    userPreferencesState = di.inject(userPreferencesStateInjectable);
  });

  it("updates the saved log viewer preferences and the current tab data", () => {
    const setLogTabData = vi.fn();
    const model = createMockLogTabViewModel("tab-id", userPreferencesState, {
      getLogTabData: () => getDefaultOnePodLogTabData(),
      setLogTabData,
    });

    model.updateLogPreferences({ showTimestamps: true });

    expect(userPreferencesState.logViewerPreferences).toEqual({
      showTimestamps: true,
      showWordWrap: true,
    });
    expect(setLogTabData).toHaveBeenCalledWith("tab-id", {
      ...getDefaultOnePodLogTabData(),
      showTimestamps: true,
    });
  });
});
