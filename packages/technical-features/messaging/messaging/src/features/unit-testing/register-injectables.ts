/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated manually for messaging package
 *
 * This file explicitly registers all injectables in this feature.
 */

import {
  enlistMessageChannelListenerStubInjectable,
  enlistRequestChannelListenerStubInjectable,
  requestFromChannelStubInjectable,
  sendMessageToChannelStubInjectable,
} from "./test-doubles.injectable";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

export function registerInjectables(di: DiContainerForInjection): void {
  di.register(sendMessageToChannelStubInjectable);
  di.register(enlistMessageChannelListenerStubInjectable);
  di.register(requestFromChannelStubInjectable);
  di.register(enlistRequestChannelListenerStubInjectable);
}
