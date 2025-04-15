/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { winstonLoggerInjectable } from "@freelensapp/logger";
import type { SendMessageToChannel } from "@freelensapp/messaging";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import type { DiContainer } from "@ogre-tools/injectable";
import type winston from "winston";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import closeRendererLogFileInjectable from "./close-renderer-log-file.injectable";
import type IpcLogTransport from "./ipc-transport";
import ipcLogTransportInjectable from "./ipc-transport.injectable";
import rendererLogFileIdInjectable from "./renderer-log-file-id.injectable";

describe("close renderer file logging", () => {
  let di: DiContainer;
  let sendIpcMock: SendMessageToChannel;
  let winstonMock: winston.Logger;
  let ipcTransportMock: IpcLogTransport;

  beforeEach(() => {
    di = getDiForUnitTesting();
    sendIpcMock = jest.fn();
    winstonMock = {
      remove: jest.fn(),
    } as any as winston.Logger;
    ipcTransportMock = { name: "ipc-renderer-transport" } as IpcLogTransport;

    di.override(winstonLoggerInjectable, () => winstonMock);
    di.override(sendMessageToChannelInjectionToken, () => sendIpcMock);
    di.override(rendererLogFileIdInjectable, () => "some-log-id");
    di.override(ipcLogTransportInjectable, () => ipcTransportMock);
  });

  it("removes the transport to prevent further logging to closed file", () => {
    const closeLog = di.inject(closeRendererLogFileInjectable);

    closeLog();

    expect(winstonMock.remove).toHaveBeenCalledWith({
      name: "ipc-renderer-transport",
    });
  });
});
