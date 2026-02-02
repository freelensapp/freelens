/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../preference-item-injection-token";
import { HelmServerSide } from "./helm-server-side";

const helmServerSidePreferenceBlockInjectable = getInjectable({
  id: "helm-server-side-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "helm-server-side",
    parentId: "helm",
    orderNumber: 20,
    Component: HelmServerSide,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default helmServerSidePreferenceBlockInjectable;
