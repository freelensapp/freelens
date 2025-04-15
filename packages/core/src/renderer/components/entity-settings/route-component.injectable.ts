/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import entitySettingsRouteInjectable from "../../../common/front-end-routing/routes/entity-settings/entity-settings-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { EntitySettingsRouteComponent } from "./entity-settings";

const entitySettingsRouteComponentInjectable = getInjectable({
  id: "entity-settings-route-component",

  instantiate: (di) => ({
    route: di.inject(entitySettingsRouteInjectable),
    Component: EntitySettingsRouteComponent,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default entitySettingsRouteComponentInjectable;
