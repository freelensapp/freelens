/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { HorizontalLine } from "../../../../../renderer/components/horizontal-line/horizontal-line";
import { PreferencePageComponent } from "../../preference-page-component";
import type { PreferenceItemComponent, PreferencePage } from "../preference-item-injection-token";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

const ApplicationPage: PreferenceItemComponent<PreferencePage> = ({ children, item }) => (
  <PreferencePageComponent title="Application" id={item.id}>
    {children}
  </PreferencePageComponent>
);

const applicationPreferencePageInjectable = getInjectable({
  id: "application-preference-page",

  instantiate: () => ({
    kind: "page" as const,
    id: "application-page",
    parentId: "application-tab",
    Component: ApplicationPage,
    childSeparator: () => <HorizontalLine />,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default applicationPreferencePageInjectable;
