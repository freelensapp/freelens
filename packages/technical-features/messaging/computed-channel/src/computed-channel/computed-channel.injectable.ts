import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";

import { type IComputedValue, computed, observable, onBecomeObserved, onBecomeUnobserved, runInAction } from "mobx";

import type { MessageChannel } from "@freelensapp/messaging";
import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { computedChannelAdministrationChannel } from "./computed-channel-administration-channel.injectable";

export type ComputedChannelFactory = <T>(channel: MessageChannel<T>, pendingValue: T) => IComputedValue<T>;

export const computedChannelInjectionToken = getInjectionToken<ComputedChannelFactory>({
  id: "computed-channel-injection-token",
});

export type ChannelObserver<T> = {
  channel: MessageChannel<T>;
  observer: IComputedValue<T>;
};

export const computedChannelObserverInjectionToken = getInjectionToken<ChannelObserver<unknown>>({
  id: "computed-channel-observer",
});

const computedChannelInjectable = getInjectable({
  id: "computed-channel",

  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return ((channel, pendingValue) => {
      const observableValue = observable.box(pendingValue);

      const computedValue = computed(() => observableValue.get());

      const valueReceiverInjectable = getMessageChannelListenerInjectable({
        id: `computed-channel-value-receiver-for-${channel.id}`,
        channel,

        getHandler: () => (message) => {
          runInAction(() => {
            observableValue.set(message);
          });
        },
      });

      runInAction(() => {
        di.register(valueReceiverInjectable);
      });

      onBecomeObserved(computedValue, () => {
        runInAction(() => {
          observableValue.set(pendingValue);
        });

        sendMessageToChannel(computedChannelAdministrationChannel, {
          channelId: channel.id,
          status: "became-observed",
        });
      });

      onBecomeUnobserved(computedValue, () => {
        runInAction(() => {
          observableValue.set(pendingValue);
        });

        sendMessageToChannel(computedChannelAdministrationChannel, {
          channelId: channel.id,
          status: "became-unobserved",
        });
      });

      return computedValue;
    }) as ComputedChannelFactory;
  },

  injectionToken: computedChannelInjectionToken,
});

export default computedChannelInjectable;
