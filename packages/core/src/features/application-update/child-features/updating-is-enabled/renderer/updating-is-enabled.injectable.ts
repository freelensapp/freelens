/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelens/application";
import { requestFromChannelInjectionToken } from "@freelens/messaging";
import { getInjectablesForInitializable } from "../../../../../common/initializable-state/create";
import { updatingIsEnabledChannel, updatingIsEnabledInitializable } from "../common/token";

export const {
  stateInjectable,
  initializationInjectable,
} = getInjectablesForInitializable({
  token: updatingIsEnabledInitializable,
  init: async (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return requestFromChannel(updatingIsEnabledChannel);
  },
  phase: onLoadOfApplicationInjectionToken,
});
