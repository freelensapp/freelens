/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated manually for messaging package
 *
 * This file explicitly registers all injectables in this feature.
 */

import listeningOfChannelsInjectable from "./listening-of-channels/listening-of-channels.injectable";
import startListeningOfChannelsInjectable from "./listening-of-channels/start-listening-of-channels.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  di.register(listeningOfChannelsInjectable);
  di.register(startListeningOfChannelsInjectable);
}
