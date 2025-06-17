/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerTransportInjectionToken } from "@freelensapp/logger";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { MESSAGE } from "triple-beam";
import { closeIpcFileLoggerChannel, ipcFileLoggerChannel } from "../common/ipc-file-logger-channel";
import IpcLogTransport from "./ipc-transport";
import rendererLogFileIdInjectable from "./renderer-log-file-id.injectable";

import type winston from "winston";

import type { IpcFileLogObject } from "../common/ipc-file-logger-channel";

/**
 * Winston uses symbol property for the actual message.
 *
 * For that to get through IPC, use the internalMessage property instead
 */
function serializeLogForIpc(fileId: string, entry: winston.LogEntry): IpcFileLogObject {
  return {
    fileId,
    entry: {
      level: entry.level,
      message: entry.message,
      internalMessage: Object.getOwnPropertyDescriptor(entry, MESSAGE)?.value,
    },
  };
}

const ipcLogTransportInjectable = getInjectable({
  id: "renderer-file-logger-transport",
  instantiate: (di) => {
    const messageToChannel = di.inject(sendMessageToChannelInjectionToken);
    const fileId = di.inject(rendererLogFileIdInjectable);

    return new IpcLogTransport({
      sendIpcLogMessage: (entry) => messageToChannel(ipcFileLoggerChannel, serializeLogForIpc(fileId, entry)),
      closeIpcLogging: () => messageToChannel(closeIpcFileLoggerChannel, fileId),
      handleExceptions: false,
      level: "info",
    });
  },
  injectionToken: loggerTransportInjectionToken,
});

export default ipcLogTransportInjectable;
