/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import extensionsInjectable from "./extensions.injectable";

import type { IComputedValue } from "mobx";

import type { LensMainExtension } from "./lens-main-extension";

const mainExtensionsInjectable = getInjectable({
  id: "main-extensions",

  instantiate: (di) => di.inject(extensionsInjectable) as IComputedValue<LensMainExtension[]>,
});

export default mainExtensionsInjectable;
