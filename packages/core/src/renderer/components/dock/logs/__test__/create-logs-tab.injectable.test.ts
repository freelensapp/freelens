/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import createLogsTabInjectable from "../create-logs-tab.injectable";
import getLogTabDataInjectable from "../get-log-tab-data.injectable";
import getRandomIdForPodLogsTabInjectable from "../get-random-id-for-pod-logs-tab.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";

describe("create logs tab", () => {
  let di: DiContainer;
  let userPreferencesState: UserPreferencesState;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(getRandomIdForPodLogsTabInjectable, () => () => "test-id");

    userPreferencesState = di.inject(userPreferencesStateInjectable);
  });

  it("uses global log viewer preferences as the default tab state", () => {
    userPreferencesState.logViewerPreferences = {
      showTimestamps: true,
      showWordWrap: false,
    };

    const createLogsTab = di.inject(createLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const tabId = createLogsTab("Pod some-pod", {
      namespace: "default",
      selectedPodId: "pod-1",
      selectedContainer: "container-1",
    });

    expect(getLogTabData(tabId)).toMatchObject({
      namespace: "default",
      selectedPodId: "pod-1",
      selectedContainer: "container-1",
      showTimestamps: true,
      showWordWrap: false,
    });
  });

  it("defaults showPrevious to false for a new tab regardless of the previously viewed pod", () => {
    userPreferencesState.logViewerPreferences = {
      showTimestamps: true,
      showWordWrap: false,
    };

    const createLogsTab = di.inject(createLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const tabId = createLogsTab("Pod some-pod", {
      namespace: "default",
      selectedPodId: "pod-1",
      selectedContainer: "container-1",
    });

    expect(getLogTabData(tabId)).toMatchObject({
      showPrevious: false,
    });
  });
});
