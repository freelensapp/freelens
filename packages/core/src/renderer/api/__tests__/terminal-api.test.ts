/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
        logger: di.inject(loggerInjectionToken),
        requestShellToken: async () => new Uint8Array(),
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

class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static readonly instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  readonly sent: TerminalMessage[] = [];

  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  serverSend(message: TerminalMessage) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(message) }));
  }

  serverClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent("close", { code: 1000, wasClean: true }));
  }
}

describe("TerminalApi messages sent before the shell is ready", () => {
  let api: TerminalApi;

  const stdin = (data: string): TerminalMessage => ({ type: TerminalChannels.STDIN, data });
  const resize = (width: number, height: number): TerminalMessage => ({
    type: TerminalChannels.RESIZE,
    data: { width, height },
  });
  const ping: TerminalMessage = { type: TerminalChannels.PING };

  const createApi = () => {
    const di = getDiForUnitTesting();

    return new TerminalApi(
      {
        defaultParams: di.inject(defaultWebsocketApiParamsInjectable),
        logger: di.inject(loggerInjectionToken),
        requestShellToken: async () => new Uint8Array(),
      },
      { id: "some-tab-id" },
    );
  };

  beforeEach(async () => {
    FakeWebSocket.instances.length = 0;
    vi.stubGlobal("WebSocket", FakeWebSocket);

    api = createApi();

    await api.connect();
    FakeWebSocket.instances[0].serverOpen();
  });

  afterEach(() => {
    api.destroy();
    vi.unstubAllGlobals();
  });

  it("holds the initial resize and stdin on an open socket", () => {
    api.sendMessage(stdin("ls\r"));

    expect(api.isReady).toBe(false);
    expect(FakeWebSocket.instances[0].sent).toEqual([]);
  });

  it("does not hold back pings", () => {
    api.sendMessage(ping);
    api.ping();

    expect(FakeWebSocket.instances[0].sent).toEqual([ping, ping]);
  });

  it.each([
    ["stdout", { type: TerminalChannels.STDOUT, data: "$ " } as TerminalMessage],
    ["connected", { type: TerminalChannels.CONNECTED } as TerminalMessage],
  ])("sends what it held, in order, on the first %s frame", (_, frame) => {
    const [socket] = FakeWebSocket.instances;

    api.sendMessage(stdin("ls\r"));
    api.sendTerminalSize(100, 40);
    socket.serverSend(statusFrame("Downloading kubectl ...", "info"));

    expect(socket.sent).toEqual([]);

    socket.serverSend(frame);

    expect(api.isReady).toBe(true);
    expect(socket.sent).toEqual([resize(120, 80), stdin("ls\r"), resize(100, 40)]);
  });

  it("sends at once once the shell is ready", () => {
    const [socket] = FakeWebSocket.instances;

    socket.serverSend({ type: TerminalChannels.STDOUT, data: "$ " });
    api.sendMessage(stdin("ls\r"));

    expect(socket.sent).toEqual([resize(120, 80), stdin("ls\r")]);
  });

  it("holds messages across a reconnect and sends them once, on the new socket, when it is ready", async () => {
    const [oldSocket] = FakeWebSocket.instances;

    oldSocket.serverSend({ type: TerminalChannels.STDOUT, data: "$ " });
    oldSocket.serverClose();

    expect(api.isReady).toBe(false);

    api.sendMessage(stdin("ls\r"));
    await api.connect();

    const newSocket = FakeWebSocket.instances[1];

    newSocket.serverOpen();

    expect(newSocket.sent).toEqual([]);

    newSocket.serverSend({ type: TerminalChannels.CONNECTED });

    expect(api.isReady).toBe(true);
    expect(oldSocket.sent).toEqual([resize(120, 80)]);
    expect(newSocket.sent).toEqual([stdin("ls\r"), resize(120, 80)]);
  });

  it("sends the last reported size, not the placeholder, to the session of a reconnect", async () => {
    const [oldSocket] = FakeWebSocket.instances;

    oldSocket.serverSend({ type: TerminalChannels.STDOUT, data: "$ " });
    api.sendTerminalSize(100, 40);
    oldSocket.serverClose();

    await api.connect();

    const newSocket = FakeWebSocket.instances[1];

    newSocket.serverOpen();
    newSocket.serverSend({ type: TerminalChannels.CONNECTED });

    expect(oldSocket.sent).toEqual([resize(120, 80), resize(100, 40)]);
    expect(newSocket.sent).toEqual([resize(100, 40)]);
  });

  it("does not let the placeholder override a size reported before the socket opens", async () => {
    const earlyApi = createApi();

    try {
      await earlyApi.connect();

      const socket = FakeWebSocket.instances[1];

      earlyApi.sendTerminalSize(100, 40);
      socket.serverOpen();
      socket.serverSend({ type: TerminalChannels.STDOUT, data: "$ " });

      const resizes = socket.sent.filter(({ type }) => type === TerminalChannels.RESIZE);

      expect(resizes.at(-1)).toEqual(resize(100, 40));
      expect(resizes).not.toContainEqual(resize(120, 80));
    } finally {
      earlyApi.destroy();
    }
  });
});
