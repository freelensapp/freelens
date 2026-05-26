/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultLogViewerPreferences } from "../../../../../features/user-preferences/common/preferences-helpers";
import { SearchStore } from "../../../../search-store/search-store";
import { LogTabViewModel } from "../logs-view-model";
import { dockerPod } from "./pod.mock";

import type { UserPreferencesState } from "../../../../../features/user-preferences/common/state.injectable";
import type { TabId } from "../../dock/store";
import type { LogTabViewModelDependencies } from "../logs-view-model";
import type { LogTabData } from "../tab-store";

export function initializeDefaultLogViewerPreferences(userPreferencesState: UserPreferencesState) {
  userPreferencesState.logViewerPreferences = { ...defaultLogViewerPreferences };
}

export function getDefaultOnePodLogTabData(overrides: Partial<LogTabData> = {}): LogTabData {
  return {
    selectedPodId: dockerPod.getId(),
    selectedContainer: dockerPod.getContainers()[0].name,
    namespace: dockerPod.getNs(),
    showPrevious: false,
    showTimestamps: false,
    showWordWrap: true,
    ...overrides,
  };
}

export function createMockLogTabViewModel(
  tabId: TabId,
  userPreferencesState: UserPreferencesState,
  deps: Partial<LogTabViewModelDependencies>,
) {
  return new LogTabViewModel(tabId, {
    getLogs: jest.fn(() => []),
    getLogsWithoutTimestamps: jest.fn(() => []),
    getTimestampSplitLogs: jest.fn(() => []),
    getLogTabData: jest.fn(),
    setLogTabData: jest.fn(),
    loadLogs: jest.fn(),
    reloadLogs: jest.fn(),
    renameTab: jest.fn(),
    stopLoadingLogs: jest.fn(),
    getPodById: jest.fn(),
    getPodsByOwnerId: jest.fn(),
    areLogsPresent: jest.fn(),
    searchStore: new SearchStore(),
    downloadLogs: jest.fn(),
    downloadAllLogs: jest.fn(),
    userPreferencesState,
    ...deps,
  });
}
