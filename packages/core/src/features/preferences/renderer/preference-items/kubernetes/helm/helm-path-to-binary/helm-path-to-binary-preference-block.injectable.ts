/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../preference-item-injection-token";
import { HelmPathToBinary } from "./helm-path-to-binary";

const helmPathToBinaryPreferenceBlockInjectable = getInjectable({
  id: "helm-path-to-binary-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "helm-path-to-binary",
    parentId: "helm",
    orderNumber: 10,
    Component: HelmPathToBinary,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default helmPathToBinaryPreferenceBlockInjectable;
