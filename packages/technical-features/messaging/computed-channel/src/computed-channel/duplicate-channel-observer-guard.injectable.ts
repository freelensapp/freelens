import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { groupBy } from "es-toolkit";
import { reaction } from "mobx";
import { computedChannelObserverInjectionToken } from "./computed-channel.injectable";

export const duplicateChannelObserverGuardInjectable = getInjectable({
  id: "duplicate-channel-observer-guard",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);

    return {
      run: () => {
        reaction(
          () => computedInjectMany(computedChannelObserverInjectionToken).get(),
          (observers) => {
            const observersByChannelId = groupBy(observers, (observer) => observer.channel.id);

            const duplicateObserverChannelIds = Object.entries(observersByChannelId)
              .filter(([, channelObservers]) => channelObservers.length > 1)
              .map(([channelId]) => channelId);

            if (duplicateObserverChannelIds.length) {
              throw new Error(
                `Tried to register duplicate channel observer for channels "${duplicateObserverChannelIds.join(
                  '", "',
                )}"`,
              );
            }
          },
        );
      },
    };
  },

  injectionToken: onLoadOfApplicationInjectionToken,
});
