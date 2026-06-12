/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { Gutter } from "../../../../../../renderer/components/gutter";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";

import type { PreferenceItemTypes } from "../../preference-item-injection-token";

const HelmGroupPreferenceItem = ({ children, item }: { children: React.ReactElement; item: PreferenceItemTypes }) => (
  <section id={item.id}>
    <h2>Helm</h2>
    {children}
  </section>
);

const helmGroupPreferenceItemInjectable = getInjectable({
  id: "helm-group-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "helm",
    parentId: "kubernetes-page",
    orderNumber: 15,
    Component: HelmGroupPreferenceItem,
    childSeparator: () => <Gutter size="xl" />,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default helmGroupPreferenceItemInjectable;
