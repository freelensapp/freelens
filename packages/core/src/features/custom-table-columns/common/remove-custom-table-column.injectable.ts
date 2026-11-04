/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";

export type RemoveCustomTableColumn = (id: string) => void;

const removeCustomTableColumnInjectable = getInjectable({
  id: "remove-custom-table-column",
  instantiate: (di): RemoveCustomTableColumn => {
    const state = di.inject(userPreferencesStateInjectable);

    return (id) => {
      runInAction(() => {
        state.customTableColumns.replace(
          state.customTableColumns
            .filter((column) => column.id !== id)
            // The anchor is gone, so fall back to appending rather than leaving a dangling
            // reference in the stored configuration.
            .map((column) => (column.after === id ? { ...column, after: undefined } : column)),
        );
      });
    };
  },
});

export default removeCustomTableColumnInjectable;
