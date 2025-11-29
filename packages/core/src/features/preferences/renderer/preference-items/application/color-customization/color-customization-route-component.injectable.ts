/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { routeSpecificComponentInjectionToken } from "../../../../../../renderer/routes/route-specific-component-injection-token";
import { ColorCustomization } from "./color-customization";
import { colorCustomizationRouteInjectable } from "./color-customization-route.injectable";

const colorCustomizationRouteComponentInjectable = getInjectable({
  id: "color-customization-route-component",

  instantiate: (di) => ({
    route: di.inject(colorCustomizationRouteInjectable),
    Component: ColorCustomization,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default colorCustomizationRouteComponentInjectable;
