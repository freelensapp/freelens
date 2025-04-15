/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { getInjectable } from "@ogre-tools/injectable";

const storesAndApisCanBeCreatedInjectable = getInjectable({
  id: "create-stores-and-apis",
  instantiate: () => false,
  injectionToken: storesAndApisCanBeCreatedInjectionToken,
});

export default storesAndApisCanBeCreatedInjectable;
