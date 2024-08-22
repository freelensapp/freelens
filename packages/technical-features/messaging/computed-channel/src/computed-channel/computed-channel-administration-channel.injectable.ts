import { reaction } from "mobx";
import { getMessageChannelListenerInjectable } from "@freelens/messaging";
import { sendMessageToChannelInjectionToken } from "@freelens/messaging";
import { computedChannelObserverInjectionToken } from "./computed-channel.injectable";
import { getMessageChannel } from "@freelens/messaging";

export type ComputedChannelAdminMessage = {
  channelId: string;
  status: "became-observed" | "became-unobserved";
};

export const computedChannelAdministrationChannel = getMessageChannel<ComputedChannelAdminMessage>(
  "computed-channel-administration-channel",
);

export const computedChannelAdministrationListenerInjectable = getMessageChannelListenerInjectable({
  id: "computed-channel-administration",
  channel: computedChannelAdministrationChannel,

  getHandler: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    const disposersByChannelId = new Map<string, () => void>();

    return (message) => {
      if (message.status === "became-observed") {
        const result = di
          .injectMany(computedChannelObserverInjectionToken)
          .find((channelObserver) => channelObserver.channel.id === message.channelId);

        if (result === undefined) {
          return;
        }

        const disposer = reaction(
          () => result.observer.get(),
          (observed) =>
            sendMessageToChannel(
              {
                id: message.channelId,
              },

              observed,
            ),
          {
            fireImmediately: true,
          },
        );

        disposersByChannelId.set(message.channelId, disposer);
      } else {
        const disposer = disposersByChannelId.get(message.channelId);

        disposer?.();
      }
    };
  },
});
