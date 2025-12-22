/**
 * AUTO-GENERATED FILE
 *
 * This file explicitly registers all injectables for common code.
 */

import applicationInformationInjectable from "./application-information.injectable";
import buildEnvironmentInjectable from "./build-environment.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  di.register(applicationInformationInjectable);
  di.register(buildEnvironmentInjectable);
}
