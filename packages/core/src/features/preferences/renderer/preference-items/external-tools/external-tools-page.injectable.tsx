/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { PreferencePageComponent } from "../../preference-page-component";
import { preferenceItemInjectionToken } from "../preference-item-injection-token";

import type { PreferenceItemComponent, PreferencePage } from "../preference-item-injection-token";

const ExternalToolsPage: PreferenceItemComponent<PreferencePage> = ({ children, item }) => (
  <PreferencePageComponent title="External Tools" id={item.id}>
    {children}
  </PreferencePageComponent>
);

const externalToolsPageInjectable = getInjectable({
  id: "external-tools-page",

  instantiate: () => ({
    kind: "page" as const,
    id: "external-tools-page",
    parentId: "external-tools-tab",
    Component: ExternalToolsPage,
    childSeparator: () => <></>,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default externalToolsPageInjectable;
