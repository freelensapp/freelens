/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import type { ShowNotification } from "./notifications";
import { notificationsStoreInjectable } from "./notifications-store.injectable";
import { NotificationStatus } from "./notifications.store";

export const showSuccessNotificationInjectable = getInjectable({
  id: "show-success-notification",

  instantiate: (di): ShowNotification => {
    const notificationsStore = di.inject(notificationsStoreInjectable);

    return (message, customOpts = {}) =>
      notificationsStore.add({
        status: NotificationStatus.OK,
        timeout: 5000,
        message,
        ...customOpts,
      });
  },
});
