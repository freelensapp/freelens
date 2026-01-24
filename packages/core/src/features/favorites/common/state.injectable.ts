/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";
import { FavoritesStorageState } from "./storage.injectable";

const favoritesStateInjectable = getInjectable({
  id: "favorites-state",
  instantiate: () => observable.box<FavoritesStorageState>({ items: [] }),
});

export default favoritesStateInjectable;
