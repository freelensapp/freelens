/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../../../preferences/renderer/preference-items/preference-item-injection-token";
import { HelmCharts } from "./helm-charts";

const helmChartsPreferenceBlockInjectable = getInjectable({
  id: "helm-charts-preference-block",

  instantiate: () => ({
    kind: "block" as const,
    id: "helm-charts",
    parentId: "kubernetes-page",
    orderNumber: 30,
    Component: HelmCharts,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default helmChartsPreferenceBlockInjectable;
