import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Tab } from "../../../../renderer/components/tabs";
import type { PreferenceTab } from "../preference-items/preference-item-injection-token";
import preferenceTabIsActiveInjectable from "./navigate-to-preference-tab/preference-tab-is-active.injectable";

interface Dependencies {
  tabIsActive: IComputedValue<boolean>;
}

interface PreferenceNavigationTabProps {
  tab: PreferenceTab;
}

const NonInjectedPreferencesNavigationTab = observer(
  ({ tabIsActive, tab }: Dependencies & PreferenceNavigationTabProps) => (
    <Tab active={tabIsActive.get()} label={tab.label} data-preference-tab-link-test={tab.pathId} value={tab.pathId} />
  ),
);

export const PreferencesNavigationTab = withInjectables<Dependencies, PreferenceNavigationTabProps>(
  NonInjectedPreferencesNavigationTab,
  {
    getProps: (di, props) => ({
      ...props,
      tabIsActive: di.inject(preferenceTabIsActiveInjectable, props.tab.pathId),
    }),
  },
);
