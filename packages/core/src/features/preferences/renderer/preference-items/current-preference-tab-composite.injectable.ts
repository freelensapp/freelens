/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { pipeline } from "@ogre-tools/fp";
import { getInjectable } from "@ogre-tools/injectable";
import { filter, map } from "lodash/fp";
import { computed } from "mobx";
import { getCompositeNormalization } from "../../../../common/utils/composite/get-composite-normalization/get-composite-normalization";
import type { Composite } from "../../../../common/utils/composite/get-composite/get-composite";
import currentPreferenceTabIdInjectable from "./current-preference-tab-id.injectable";
import type { PreferenceItemTypes, PreferenceTab } from "./preference-item-injection-token";
import type { PreferenceTabsRoot } from "./preference-tab-root";
import preferencesCompositeInjectable from "./preferences-composite.injectable";

const currentPreferenceTabCompositeInjectable = getInjectable({
  id: "current-preference-page-composite",

  instantiate: (di) => {
    const currentTabId = di.inject(currentPreferenceTabIdInjectable);
    const preferencesComposite = di.inject(preferencesCompositeInjectable);

    return computed(() => {
      const tabId = currentTabId.get();

      const tabComposites = pipeline(
        getCompositeNormalization(preferencesComposite.get()),
        map(([, composite]) => composite),
        filter(isPreferenceTab),
        filter(hasMatchingPathId(tabId)),
      );

      if (tabComposites.length === 0) {
        return undefined;
      }

      return tabComposites[0];
    });
  },
});

const isPreferenceTab = (
  composite: Composite<PreferenceItemTypes | PreferenceTabsRoot>,
): composite is Composite<PreferenceTab> => composite.value.kind === "tab";

const hasMatchingPathId =
  (preferenceTabId: string) =>
  ({ value: { pathId } }: Composite<PreferenceTab>) =>
    pathId === preferenceTabId;

export default currentPreferenceTabCompositeInjectable;
