import {
  enlistMessageChannelListenerStubInjectable,
  enlistRequestChannelListenerStubInjectable,
  requestFromChannelStubInjectable,
  sendMessageToChannelStubInjectable,
} from "./test-doubles.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

/**
 * Register all injectables in this directory
 */
export function registerInjectables(di: DiContainerForInjection): void {
  try {
    di.register(enlistMessageChannelListenerStubInjectable);
  } catch (e) {}

  try {
    di.register(enlistRequestChannelListenerStubInjectable);
  } catch (e) {}

  try {
    di.register(requestFromChannelStubInjectable);
  } catch (e) {}

  try {
    di.register(sendMessageToChannelStubInjectable);
  } catch (e) {}
}
