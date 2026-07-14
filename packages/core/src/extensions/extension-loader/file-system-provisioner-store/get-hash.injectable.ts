/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { getInjectable } from "@ogre-tools/injectable";

const getHashInjectable = getInjectable({
  id: "get-hash",

  instantiate: () => (text: string) => createHash("sha256").update(text).digest("hex"),
});

export default getHashInjectable;
