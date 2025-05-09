import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { listeningOfChannelsInjectionToken } from "./listening-of-channels.injectable";

const startListeningOfChannelsInjectable = getInjectable({
  id: "start-listening-of-channels",

  instantiate: (di) => {
    const listeningOfChannels = di.inject(listeningOfChannelsInjectionToken);

    return {
      run: async () => {
        await listeningOfChannels.start();
      },
    };
  },

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startListeningOfChannelsInjectable;
