/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainerForInjection } from "@ogre-tools/injectable";

/**
 * Register common injectables for the ai-chat feature.
 * Currently no injectables to register — common/ only exports types and channels.
 * This file exists so the DI registration hierarchy is consistent.
 */
export function registerInjectables(_di: DiContainerForInjection): void {
  // No injectables in common — types and channels are plain exports.
}
