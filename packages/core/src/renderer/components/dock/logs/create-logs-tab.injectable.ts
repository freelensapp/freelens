/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { defaultLogViewerPreferences } from "../../../../features/user-preferences/common/preferences-helpers";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import createDockTabInjectable from "../dock/create-dock-tab.injectable";
import { TabKind } from "../dock/store";
import getRandomIdForPodLogsTabInjectable from "./get-random-id-for-pod-logs-tab.injectable";
import setLogTabDataInjectable from "./set-log-tab-data.injectable";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";
import type { DockTab, DockTabCreate, TabId } from "../dock/store";
import type { LogTabData } from "./tab-store";

export type CreateLogsTabData = Pick<LogTabData, "owner" | "selectedPodId" | "selectedContainer" | "namespace"> &
  Omit<Partial<LogTabData>, "owner" | "selectedPodId" | "selectedContainer" | "namespace">;

interface Dependencies {
  createDockTab: (rawTabDesc: DockTabCreate, addNumber?: boolean) => DockTab;
  setLogTabData: (tabId: string, data: LogTabData) => void;
  getRandomId: () => string;
  userPreferencesState: UserPreferencesState;
}

const createLogsTab =
  ({ createDockTab, setLogTabData, getRandomId, userPreferencesState }: Dependencies) =>
  (title: string, data: CreateLogsTabData): TabId => {
    const id = `log-tab-${getRandomId()}`;

    runInAction(() => {
      createDockTab(
        {
          id,
          title,
          kind: TabKind.POD_LOGS,
        },
        false,
      );
      // Apply saved log preferences first so explicit tab data can override them.
      setLogTabData(id, {
        ...(userPreferencesState.logViewerPreferences ?? defaultLogViewerPreferences),
        ...data,
      });
    });

    return id;
  };

const createLogsTabInjectable = getInjectable({
  id: "create-logs-tab",

  instantiate: (di) =>
    createLogsTab({
      createDockTab: di.inject(createDockTabInjectable),
      setLogTabData: di.inject(setLogTabDataInjectable),
      getRandomId: di.inject(getRandomIdForPodLogsTabInjectable),
      userPreferencesState: di.inject(userPreferencesStateInjectable),
    }),
});

export default createLogsTabInjectable;
