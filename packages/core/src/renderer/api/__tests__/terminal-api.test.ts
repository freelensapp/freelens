/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { TerminalChannels } from "../../../common/terminal/channels";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import defaultWebsocketApiParamsInjectable from "../default-websocket-api-params.injectable";
import { TerminalApi } from "../terminal-api";

import type { TerminalMessage, TerminalStatusLevel } from "../../../common/terminal/channels";

class TestTerminalApi extends TerminalApi {
  receive(message: TerminalMessage) {
    this._onMessage(new MessageEvent("message", { data: JSON.stringify(message) }));
  }

  emitInitialStatus(message: string, level: TerminalStatusLevel) {
    this.emitTerminalStatus(message, level);
  }
}

const statusFrame = (message: string, level: TerminalStatusLevel): TerminalMessage => ({
  type: TerminalChannels.STATUS,
  data: { message, level },
});

describe("TerminalApi status frames", () => {
  let api: TestTerminalApi;
  let status: { data: string; level: TerminalStatusLevel }[];
  let data: string[];

  beforeEach(() => {
    const di = getDiForUnitTesting();

    api = new TestTerminalApi(
      {
        defaultParams: di.inject(defaultWebsocketApiParamsInjectable),
        hostedClusterId: "some-cluster-id",
        logger: di.inject(loggerInjectionToken),
      },
      { id: "some-tab-id" },
    );

    status = [];
    data = [];
    api.on("status", (line, level) => status.push({ data: line, level }));
    api.on("data", (line) => data.push(line));
  });

  it("emits an info frame as an unterminated line that the next one overwrites", () => {
    api.receive(statusFrame("Checking kubectl v1.33.4 ...", "info"));

    expect(status).toEqual([{ data: "\u001b[2K\r\u001b[90mChecking kubectl v1.33.4 ...\u001b[0m", level: "info" }]);
    expect(status[0].data).not.toContain("\n");
  });

  it("emits an error frame in red, ending its own line so the next frame cannot erase it", () => {
    api.receive(statusFrame("Failed to download kubectl v1.33.4", "error"));

    expect(status).toEqual([
      { data: "\u001b[2K\r\u001b[31mFailed to download kubectl v1.33.4\u001b[0m\r\n", level: "error" },
    ]);
  });

  it("does not mark the session as ready, which would flush stdin before the shell exists", () => {
    api.receive(statusFrame("Starting shell ...", "info"));
    api.receive(statusFrame("Something went wrong", "error"));

    expect(api.isReady).toBe(false);
    expect(data).toEqual([]);
  });

  it("puts the initial connecting message on that same line", () => {
    api.emitInitialStatus("Connecting ...", "info");

    expect(status).toEqual([{ data: "\u001b[2K\r\u001b[90mConnecting ...\u001b[0m", level: "info" }]);
    expect(data).toEqual([]);
  });

  it("still marks the session as ready on stdout", () => {
    api.receive({ type: TerminalChannels.STDOUT, data: "$ " });

    expect(data).toEqual(["$ "]);
  });
});
