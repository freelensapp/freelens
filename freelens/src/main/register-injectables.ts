/**
 * AUTO-GENERATED FILE
 *
 * This file explicitly registers all injectables for the main process.
 */

import { nodeEnvInjectable } from "./node-env.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  di.register(nodeEnvInjectable);
}
