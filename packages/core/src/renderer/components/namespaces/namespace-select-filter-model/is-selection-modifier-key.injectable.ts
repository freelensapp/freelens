/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import isMacInjectable from "../../../../common/vars/is-mac.injectable";

import type React from "react";

export type IsSelectionModifierKey = (event: React.KeyboardEvent) => boolean;

const isSelectionModifierKeyInjectable = getInjectable({
  id: "is-selection-modifier-key",
  instantiate: (di): IsSelectionModifierKey => {
    const isMac = di.inject(isMacInjectable);

    return isMac ? ({ key }) => key === "Meta" : ({ key }) => key === "Control";
  },
});

export default isSelectionModifierKeyInjectable;
