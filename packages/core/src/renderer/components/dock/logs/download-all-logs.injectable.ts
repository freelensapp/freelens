/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { PodLogsQuery } from "@freelens/kube-object";
import type { ResourceDescriptor } from "@freelens/kube-api";
import { loggerInjectionToken } from "@freelens/logger";
import openSaveFileDialogInjectable from "../../../utils/save-file.injectable";
import { showErrorNotificationInjectable } from "@freelens/notifications";
import callForLogsInjectable from "./call-for-logs.injectable";

const downloadAllLogsInjectable = getInjectable({
  id: "download-all-logs",

  instantiate: (di) => {
    const callForLogs = di.inject(callForLogsInjectable);
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    return async (params: ResourceDescriptor, query: PodLogsQuery) => {
      const logs = await callForLogs(params, query).catch(error => {
        logger.error("Can't download logs: ", error);
      });

      if (logs) {
        openSaveFileDialog(`${query.container}.log`, logs, "text/plain");
      } else {
        showErrorNotification("No logs to download");
      }
    };
  },
});

export default downloadAllLogsInjectable;
