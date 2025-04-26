/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterApplicationIsLoadedInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";

const emitServiceStartToEventBusInjectable = getInjectable({
  id: "emit-service-start-to-event-bus",

  instantiate: (di) => ({
    run: () => {
      const emitAppEvent = di.inject(emitAppEventInjectable);

      emitAppEvent({ name: "service", action: "start" });
    },
  }),

  injectionToken: afterApplicationIsLoadedInjectionToken,
});

export default emitServiceStartToEventBusInjectable;
