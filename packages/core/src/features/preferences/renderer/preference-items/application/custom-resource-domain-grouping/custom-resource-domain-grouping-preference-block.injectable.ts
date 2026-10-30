/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { CustomResourceDomainGrouping } from "./custom-resource-domain-grouping";

const customResourceDomainGroupingPreferenceBlockInjectable = getInjectable({
  id: "custom-resource-domain-grouping-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "custom-resource-domain-grouping",
    parentId: "application-page",
    orderNumber: 35,
    Component: CustomResourceDomainGrouping,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default customResourceDomainGroupingPreferenceBlockInjectable;
