/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { WithTooltip } from "../../../renderer/components/with-tooltip";
import { customTableColumnSlug } from "../common/custom-table-column";
import customTableColumnsInjectable from "../common/custom-table-columns.injectable";
import { evaluateCustomColumn } from "../common/evaluate-custom-column";

import type { KubeObject } from "@freelensapp/kube-object";
import type { GeneralKubeObjectListLayoutColumn } from "@freelensapp/list-layout";

import type { IComputedValue } from "mobx";

import type { CustomTableColumn } from "../common/custom-table-column";

/**
 * A custom column in the shape the list layout renders, except for its priority: that can only be
 * resolved against the columns of the list it ends up in.
 *
 * @see resolveCustomColumnPriorities
 */
export type CustomKubeObjectListLayoutColumn = Omit<GeneralKubeObjectListLayoutColumn, "priority"> &
  Pick<CustomTableColumn, "after">;

const toClassName = (column: CustomTableColumn) => `custom-column-${customTableColumnSlug(column.id)}`;

const toLayoutColumn = (column: CustomTableColumn): CustomKubeObjectListLayoutColumn => ({
  id: column.id,
  kind: column.kind,
  apiVersion: column.apiVersion,
  after: column.after,
  header: {
    title: column.title,
    className: toClassName(column),
    sortBy: column.id,
    id: column.id,
    "data-testid": `${toClassName(column)}-title`,
  },
  content: (item: KubeObject) => ({
    className: toClassName(column),
    title: <WithTooltip>{evaluateCustomColumn(item, column.jsonPath).text}</WithTooltip>,
    "data-testid": `${toClassName(column)}-cell-for-${item.getId()}`,
  }),
  sortingCallBack: (item: KubeObject) => evaluateCustomColumn(item, column.jsonPath).sortBy,
});

/**
 * The user defined columns of every resource, ready to be merged into a list next to the columns
 * the application and the extensions contribute.
 */
const customListLayoutColumnsInjectable = getInjectable({
  id: "custom-list-layout-columns",
  instantiate: (di): IComputedValue<CustomKubeObjectListLayoutColumn[]> => {
    const customTableColumns = di.inject(customTableColumnsInjectable);

    return computed(() => customTableColumns.get().map(toLayoutColumn));
  },
});

export default customListLayoutColumnsInjectable;
