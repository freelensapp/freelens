/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SendMessageToChannel } from "@freelensapp/messaging";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import type { DiContainer } from "@ogre-tools/injectable";
import { MESSAGE } from "triple-beam";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import ipcLogTransportInjectable from "./ipc-transport.injectable";
import rendererLogFileIdInjectable from "./renderer-log-file-id.injectable";

describe("renderer log transport through ipc", () => {
  let di: DiContainer;
  let sendIpcMock: SendMessageToChannel;

  beforeEach(() => {
    sendIpcMock = jest.fn();
    di = getDiForUnitTesting();
    di.override(sendMessageToChannelInjectionToken, () => sendIpcMock);
    di.override(rendererLogFileIdInjectable, () => "some-log-id");
  });

  it("send serialized ipc messages on log", () => {
    const logTransport = di.inject(ipcLogTransportInjectable);

    logTransport.log(
      {
        level: "info",
        message: "some log text",
        [MESSAGE]: "actual winston log text",
      },
      () => {},
    );

    expect(sendIpcMock).toHaveBeenCalledWith(
      { id: "ipc-file-logger-channel" },
      {
        entry: {
          level: "info",
          message: "some log text",
          internalMessage: "actual winston log text",
        },
        fileId: "some-log-id",
      },
    );
  });
});
