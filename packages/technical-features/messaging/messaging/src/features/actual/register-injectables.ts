import listeningOfChannelsInjectable from "./listening-of-channels/listening-of-channels.injectable";
import startListeningOfChannelsInjectable from "./listening-of-channels/start-listening-of-channels.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

/**
 * Register all injectables in this directory
 */
export function registerInjectables(di: DiContainerForInjection): void {
  try {
    di.register(listeningOfChannelsInjectable);
  } catch (e) {}

  try {
    di.register(startListeningOfChannelsInjectable);
  } catch (e) {}
}
