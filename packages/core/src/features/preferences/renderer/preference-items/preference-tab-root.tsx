import type { Orderable } from "@freelensapp/utilities";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Discriminable } from "../../../../common/utils/composable-responsibilities/discriminable/discriminable";
import type { RootComposite } from "../../../../common/utils/composite/interfaces";
import { HorizontalLine } from "../../../../renderer/components/horizontal-line/horizontal-line";
import type { ChildrenAreSeparated } from "./preference-item-injection-token";
import styles from "./preference-tab-root.module.scss";

export type PreferenceTabsRoot = Discriminable<"preference-tabs-root"> &
  RootComposite &
  ChildrenAreSeparated &
  Orderable;

export const preferenceTabsRoot: PreferenceTabsRoot = {
  kind: "preference-tabs-root" as const,
  id: "preference-tabs",
  parentId: undefined,
  orderNumber: Infinity,

  childSeparator: () => (
    <div className={styles.TabSeparator}>
      <HorizontalLine size="sm" />
    </div>
  ),
};
