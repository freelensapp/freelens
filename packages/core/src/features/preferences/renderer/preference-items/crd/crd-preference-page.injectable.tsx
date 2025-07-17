/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { HorizontalLine } from "../../../../../renderer/components/horizontal-line/horizontal-line";
import { PreferencePageComponent } from "../../preference-page-component";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";
import type { PreferenceItemComponent, PreferencePage } from "../preference-item-injection-token";

const CrdPage: PreferenceItemComponent<PreferencePage> = ({ children, item }) => (
  <PreferencePageComponent title="CRDs" id={item.id}>
    {children}
  </PreferencePageComponent>
);

const crdPreferencePageInjectable = getInjectable({
  id: "crd-preference-page",

  instantiate: () => ({
    kind: "page" as const,
    id: "crd-page",
    parentId: "crd-tab",
    Component: CrdPage,
    childSeparator: () => <HorizontalLine size="sm" />,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default crdPreferencePageInjectable;
