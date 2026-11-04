/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";

import type { CustomTableColumn } from "./custom-table-column";

export type UpdateCustomTableColumn = (id: string, changes: Partial<Omit<CustomTableColumn, "id">>) => void;

const updateCustomTableColumnInjectable = getInjectable({
  id: "update-custom-table-column",
  instantiate: (di): UpdateCustomTableColumn => {
    const state = di.inject(userPreferencesStateInjectable);

    return (id, changes) => {
      const index = state.customTableColumns.findIndex((column) => column.id === id);

      if (index < 0) {
        return;
      }

      runInAction(() => {
        state.customTableColumns[index] = {
          ...state.customTableColumns[index],
          ...changes,
          id,
        };
      });
    };
  },
});

export default updateCustomTableColumnInjectable;
