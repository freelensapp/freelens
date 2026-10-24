/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { PreferenceDescriptors } from "./preference-descriptors.injectable";
import type { StoreType } from "./preferences-helpers";

export type UserPreferencesState = {
  -readonly [Field in keyof PreferenceDescriptors]: StoreType<PreferenceDescriptors[Field]>;
};

const userPreferencesStateInjectable = getInjectable({
  id: "user-preferences-state",
  instantiate: () =>
    observable.object({
      // Collection-typed fields are read by component lifecycle hooks (e.g.
      // ItemListLayout.componentDidMount reads hiddenTableColumns.get(...))
      // before the persistent store's fromStore() action has populated them.
      // Default them to empty observable collections so a not-yet-loaded store
      // cannot crash those views; fromStore() reassigns the fields on load.
      hiddenTableColumns: observable.map<string, Set<string>>(),
    } as unknown as UserPreferencesState),
});

export default userPreferencesStateInjectable;
