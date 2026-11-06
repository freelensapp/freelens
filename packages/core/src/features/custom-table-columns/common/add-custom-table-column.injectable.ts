/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { customTableColumnIdPrefix } from "./custom-table-column";
import getRandomIdForCustomTableColumnInjectable from "./get-random-id-for-custom-table-column.injectable";

import type { CustomTableColumn } from "./custom-table-column";

export type AddCustomTableColumn = (column: Omit<CustomTableColumn, "id">) => CustomTableColumn;

const addCustomTableColumnInjectable = getInjectable({
  id: "add-custom-table-column",
  instantiate: (di): AddCustomTableColumn => {
    const state = di.inject(userPreferencesStateInjectable);
    const getRandomId = di.inject(getRandomIdForCustomTableColumnInjectable);

    return (column) => {
      const added: CustomTableColumn = {
        ...column,
        id: `${customTableColumnIdPrefix}${getRandomId()}`,
      };

      runInAction(() => {
        state.customTableColumns.push(added);
      });

      return added;
    };
  },
});

export default addCustomTableColumnInjectable;
