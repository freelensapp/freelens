import { JsonApiErrorParsed } from "@freelensapp/json-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import type { Disposer } from "@freelensapp/utilities";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { CreateNotificationOptions } from "./notifications.store";
import { showErrorNotificationInjectable } from "./show-error-notification.injectable";

export type ShowCheckedErrorNotification = (
  message: unknown,
  fallback: string,
  opts?: CreateNotificationOptions,
) => Disposer;

export const showCheckedErrorNotificationInjectable = getInjectable({
  id: "show-checked-error-notififcation",
  instantiate: (di): ShowCheckedErrorNotification => {
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);

    return (message, fallback, opts) => {
      if (typeof message === "string" || message instanceof Error || message instanceof JsonApiErrorParsed) {
        return showErrorNotification(message, opts);
      }

      logger.warn("[NOTIFICATIONS]: Unknown notification error message, falling back to default", message);

      return showErrorNotification(fallback, opts);
    };
  },
});
