/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { PreferencePageComponent } from "../../../preferences/renderer/preference-page-component";
import { preferenceItemInjectionToken } from "../../../preferences/renderer/preference-items/preference-item-injection-token";

import type { PreferenceItemComponent, PreferencePage } from "../../../preferences/renderer/preference-items/preference-item-injection-token";

const AiPage: PreferenceItemComponent<PreferencePage> = ({ children, item }) => (
  <PreferencePageComponent title="AI Assistant" id={item.id}>
    {children}
  </PreferencePageComponent>
);

const aiPreferencePageInjectable = getInjectable({
  id: "ai-preference-page",

  instantiate: () => ({
    kind: "page" as const,
    id: "ai-page",
    parentId: "ai-tab",
    Component: AiPage,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default aiPreferencePageInjectable;
