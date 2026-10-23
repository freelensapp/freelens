/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";

import type { IComputedValue } from "mobx";

import type { CustomTableColumn } from "./custom-table-column";

/**
 * Every custom column the user has defined, in the order they are stored.
 */
const customTableColumnsInjectable = getInjectable({
  id: "custom-table-columns",
  instantiate: (di): IComputedValue<CustomTableColumn[]> => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => [...state.customTableColumns]);
  },
});

export default customTableColumnsInjectable;
