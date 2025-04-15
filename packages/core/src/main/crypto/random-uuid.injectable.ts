/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { randomUUID } from "crypto";
import { getInjectable } from "@ogre-tools/injectable";

const randomUUIDInjectable = getInjectable({
  id: "random-uuid",
  instantiate: () => randomUUID,
  causesSideEffects: true,
});

export default randomUUIDInjectable;
