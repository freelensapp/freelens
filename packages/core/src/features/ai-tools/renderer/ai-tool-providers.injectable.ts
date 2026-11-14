/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { aiToolProviderInjectionToken } from "../common/ai-tools";

import type { AiToolProvider } from "../common/ai-tools";

/**
 * The registered providers in display order.
 */
const aiToolProvidersInjectable = getInjectable({
  id: "ai-tool-providers",
  instantiate: (di): AiToolProvider[] =>
    [...di.injectMany(aiToolProviderInjectionToken)].sort((left, right) => left.orderNumber - right.orderNumber),
});

export default aiToolProvidersInjectable;
