/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import { computed } from "mobx";
import forceUpdateModalRootFrameComponentInjectable from "./force-update-modal-root-frame-component.injectable";

export default getGlobalOverride(
  forceUpdateModalRootFrameComponentInjectable,

  () => ({
    id: "force-update-modal",
    Component: () => null,
    shouldRender: computed(() => false),
  }),
);
