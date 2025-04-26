/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { getInjectable } from "@ogre-tools/injectable";

export type GetAbsolutePath = (...args: string[]) => string;

const getAbsolutePathInjectable = getInjectable({
  id: "get-absolute-path",

  instantiate: (): GetAbsolutePath => path.resolve,

  // This causes side effect e.g. Windows creates different kinds of
  // absolute paths than linux
  causesSideEffects: true,
});

export default getAbsolutePathInjectable;
