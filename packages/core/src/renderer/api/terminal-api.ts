/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import url from "url";
import type { Logger } from "@freelensapp/logger";
import { ipcRenderer } from "electron";
import { once } from "lodash";
import isEqual from "lodash/isEqual";
import { makeObservable, observable } from "mobx";
import { TerminalChannels, type TerminalMessage } from "../../common/terminal/channels";
import type { WebSocketApiDependencies, WebSocketEvents } from "./websocket-api";
import { WebSocketApi } from "./websocket-api";

enum TerminalColor {
  RED = "\u001b[31m",
  GREEN = "\u001b[32m",
  YELLOW = "\u001b[33m",
  BLUE = "\u001b[34m",
  MAGENTA = "\u001b[35m",
  CYAN = "\u001b[36m",
  GRAY = "\u001b[90m",
  LIGHT_GRAY = "\u001b[37m",
  NO_COLOR = "\u001b[0m",
}

export interface TerminalApiQuery extends Record<string, string | undefined> {
  id: string;
  node?: string;
  type?: string;
}

export interface TerminalEvents extends WebSocketEvents {
  ready: () => void;
  connected: () => void;
}

export interface TerminalApiDependencies extends WebSocketApiDependencies {
  readonly hostedClusterId: string;
  readonly logger: Logger;
}

export class TerminalApi extends WebSocketApi<TerminalEvents> {
  protected size?: { width: number; height: number };

  @observable public isReady = false;

  constructor(
    protected readonly dependencies: TerminalApiDependencies,
    protected readonly query: TerminalApiQuery,
  ) {
    super(dependencies, {
      flushOnOpen: false,
      pingInterval: 30,
    });
    makeObservable(this);

    if (query.node) {
      query.type ||= "node";
    }
  }

  async connect() {
    if (!this.socket) {
      /**
       * Only emit this message if we are not "reconnecting", so as to keep the
       * output display clean when the computer wakes from sleep
       */
      this.emitStatus("Connecting ...");
    }

    const authTokenArray = await ipcRenderer.invoke(
      "cluster:shell-api",
      this.dependencies.hostedClusterId,
      this.query.id,
    );

    if (!(authTokenArray instanceof Uint8Array)) {
      throw new TypeError("ShellApi token is not a Uint8Array");
    }

    const { hostname, protocol, port } = location;
    const socketUrl = url.format({
      protocol: protocol.includes("https") ? "wss" : "ws",
      hostname,
      port,
      pathname: "/api",
      query: {
        ...this.query,
        shellToken: Buffer.from(authTokenArray).toString("base64"),
      },
      slashes: true,
    });

    const onReady = once((data?: string) => {
      this.isReady = true;
      this.emit("ready");
      this.removeListener("data", onReady);
      this.removeListener("connected", onReady);
      this.flush();

      // data is undefined if the event that was handled is "connected"
      if (data === undefined) {
        const lastData = window.localStorage.getItem(`${this.query.id}:last-data`);

        if (lastData) {
          /**
           * Output the last line, the makes sure that the terminal isn't completely
           * empty when the user refreshes.
           */
          this.emit("data", lastData);
        }
      }
    });

    this.prependListener("data", onReady);
    this.prependListener("connected", onReady);

    super.connect(socketUrl);
  }

  sendMessage(message: TerminalMessage) {
    return this.send(JSON.stringify(message));
  }

  sendTerminalSize(cols: number, rows: number) {
    const newSize = { width: cols, height: rows };

    if (!isEqual(this.size, newSize)) {
      this.sendMessage({
        type: TerminalChannels.RESIZE,
        data: newSize,
      });
      this.size = newSize;
    }
  }

  protected _onMessage({ data, ...evt }: MessageEvent<string>): void {
    try {
      const message = JSON.parse(data) as TerminalMessage;

      switch (message.type) {
        case TerminalChannels.STDOUT:
          /**
           * save the last data for reconnections. User localStorage because we
           * don't want this data to survive if the app is closed
           */
          window.localStorage.setItem(`${this.query.id}:last-data`, message.data);
          super._onMessage({ data: message.data, ...evt });
          break;
        case TerminalChannels.CONNECTED:
          this.emit("connected");
          break;
        default:
          this.dependencies.logger.warn(`[TERMINAL-API]: unknown or unhandleable message type`, message);
          break;
      }
    } catch (error) {
      this.dependencies.logger.error(`[TERMINAL-API]: failed to handle message`, error);
    }
  }

  protected _onOpen(evt: Event) {
    // Client should send terminal size in special channel 4,
    // But this size will be changed by terminal.fit()
    this.sendTerminalSize(120, 80);
    super._onOpen(evt);
  }

  protected _onClose(evt: CloseEvent) {
    super._onClose(evt);
    this.isReady = false;
  }

  protected emitStatus(data: string, options: { color?: TerminalColor; showTime?: boolean } = {}) {
    const { color, showTime } = options;
    const time = showTime ? `${(new Date()).toLocaleString()} ` : "";

    if (color) {
      data = `${color}${data}${TerminalColor.NO_COLOR}`;
    }

    this.emit("data", `${time}${data}\r\n`);
  }

  protected emitError(error: string) {
    this.emitStatus(error, {
      color: TerminalColor.RED,
    });
  }
}
