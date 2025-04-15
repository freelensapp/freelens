/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { getActiveHelmRepositoriesChannel } from "../../../../../common/helm/get-active-helm-repositories-channel";
import helmRepositoriesErrorStateInjectable from "./helm-repositories-error-state.injectable";

const activeHelmRepositoriesInjectable = getInjectable({
  id: "active-helm-repositories",

  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const helmRepositoriesErrorState = di.inject(helmRepositoriesErrorStateInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        const result = await requestFromChannel(getActiveHelmRepositoriesChannel);

        if (result.callWasSuccessful) {
          return result.response;
        } else {
          showErrorNotification(result.error);

          runInAction(() =>
            helmRepositoriesErrorState.set({
              controlsAreShown: false,
              errorMessage: result.error,
            }),
          );

          return [];
        }
      },

      valueWhenPending: [],
    });
  },
});

export default activeHelmRepositoriesInjectable;
