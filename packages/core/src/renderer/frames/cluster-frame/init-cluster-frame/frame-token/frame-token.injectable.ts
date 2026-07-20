/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import webFrameInjectable from "./web-frame/web-frame.injectable";

const frameTokenInjectable = getInjectable({
  id: "frame-token",
  instantiate: (di) => di.inject(webFrameInjectable).frameToken,
});

export default frameTokenInjectable;
