import { randomUUID } from "crypto";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const randomUUIDInjectable = getInjectable({
  id: "random-uuid",
  instantiate: () => randomUUID,
  causesSideEffects: true,
});

export default randomUUIDInjectable;
