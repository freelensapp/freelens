/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import type { StrictReactNode } from "@freelensapp/utilities";
import type { SearchFilter, TableCellProps, TableSortCallback } from "./list-layout-column";

export interface BaseKubeObjectListLayoutColumn<K extends KubeObject> {
  id: string;
  priority: number;
  sortingCallBack?: TableSortCallback<K>;
  searchFilter?: SearchFilter<K>;
  header: TableCellProps | undefined | null;
  content: (item: K) => StrictReactNode | TableCellProps;
}

export interface GeneralKubeObjectListLayoutColumn extends BaseKubeObjectListLayoutColumn<KubeObject> {
  kind: string;
  apiVersion: string | string[];
}

export interface SpecificKubeListLayoutColumn<K extends KubeObject> extends BaseKubeObjectListLayoutColumn<K> {}
