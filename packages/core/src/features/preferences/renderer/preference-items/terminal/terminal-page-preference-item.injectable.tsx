/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { PreferencePageComponent } from "../../preference-page-component";
import type { PreferenceItemComponent, PreferencePage } from "../preference-item-injection-token";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

const TerminalPage: PreferenceItemComponent<PreferencePage> = ({ children, item }) => (
  <PreferencePageComponent title="Terminal" id={item.id}>
    {children}
  </PreferencePageComponent>
);

const terminalPagePreferenceItemInjectable = getInjectable({
  id: "terminal-preference-page",

  instantiate: () => ({
    kind: "page" as const,
    id: "terminal-page",
    parentId: "terminal-tab",
    Component: TerminalPage,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default terminalPagePreferenceItemInjectable;
