/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rootFrameChildComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { CommandContainer } from "./command-container";

const commandContainerRootFrameChildComponentInjectable = getInjectable({
  id: "command-container-root-frame-child-component",
  instantiate: () => ({
    id: "command-container",
    shouldRender: computed(() => true),
    Component: CommandContainer,
  }),
  injectionToken: rootFrameChildComponentInjectionToken,
});

export default commandContainerRootFrameChildComponentInjectable;
