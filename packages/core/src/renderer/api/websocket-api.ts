/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import EventEmitter from "events";
import type { Defaulted } from "@freelensapp/utilities";
import { makeObservable, observable } from "mobx";
import type TypedEventEmitter from "typed-emitter";
import type { Arguments } from "typed-emitter";
import type { DefaultWebsocketApiParams } from "./default-websocket-api-params.injectable";

interface WebsocketApiParams {
  /**
   * Flush pending commands on open socket
   *
   * @default true
   */
  flushOnOpen?: boolean;

  /**
   * In case of an error, wait this many seconds before reconnecting.
   *
   * If falsy, don't reconnect
   *
   * @default 10
   */
  reconnectDelay?: number;

  /**
   * The message for pinging the websocket
   *
   * @default "{type: \"ping\"}"
   */
  pingMessage?: string;

  /**
   * If set to a number > 0, then the API will ping the socket on that interval.
   *
   * @unit seconds
   */
  pingInterval?: number;

  /**
   * Whether to show logs in the console
   *
   * @default isDevelopment
   */
  logging?: boolean;
}

export enum WebSocketApiState {
  PENDING = "pending",
  OPEN = "open",
  CONNECTING = "connecting",
  RECONNECTING = "reconnecting",
  CLOSED = "closed",
}

export interface WebSocketEvents {
  open: () => void;
  data: (message: string) => void;
  close: () => void;
}

export interface WebSocketApiDependencies {
  readonly defaultParams: DefaultWebsocketApiParams;
}

export class WebSocketApi<Events extends WebSocketEvents> extends (EventEmitter as {
  new <T>(): TypedEventEmitter<T>;
})<Events> {
  protected socket: WebSocket | null = null;
  protected pendingCommands: string[] = [];
  protected reconnectTimer?: number;
  protected pingTimer?: number;
  protected params: Defaulted<WebsocketApiParams, keyof DefaultWebsocketApiParams>;

  @observable readyState = WebSocketApiState.PENDING;

  constructor(
    protected readonly dependencies: WebSocketApiDependencies,
    params: WebsocketApiParams,
  ) {
    super();
    makeObservable(this);
    this.params = {
      ...this.dependencies.defaultParams,
      ...params,
    };
    const { pingInterval } = this.params;

    if (pingInterval) {
      this.pingTimer = window.setInterval(() => this.ping(), pingInterval * 1000);
    }
  }

  isConnected(): this is WebSocketApi<Events> & { socket: WebSocket } {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(url: string) {
    // close previous connection first
    this.socket?.close();

    // start new connection
    this.socket = new WebSocket(url);
    this.socket.addEventListener("open", (ev) => this._onOpen(ev));
    this.socket.addEventListener("message", (ev) => this._onMessage(ev));
    this.socket.addEventListener("error", (ev) => this._onError(ev));
    this.socket.addEventListener("close", (ev) => this._onClose(ev));
    this.readyState = WebSocketApiState.CONNECTING;
  }

  ping() {
    if (this.isConnected()) {
      this.send(this.params.pingMessage);
    }
  }

  reconnect(): void {
    if (!this.socket) {
      return void console.error("[WEBSOCKET-API]: cannot reconnect to a socket that is not connected");
    }

    this.connect(this.socket.url);
  }

  destroy() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
    this.pendingCommands = [];
    this.clearAllListeners();
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.readyState = WebSocketApiState.PENDING;
  }

  clearAllListeners() {
    for (const name of this.eventNames()) {
      this.removeAllListeners(name as keyof Events);
    }
  }

  send(command: string) {
    if (this.isConnected()) {
      this.socket.send(command);
    } else {
      this.pendingCommands.push(command);
    }
  }

  protected flush() {
    const commands = this.pendingCommands;

    this.pendingCommands = [];

    for (const command of commands) {
      this.send(command);
    }
  }

  protected _onOpen(evt: Event) {
    this.emit("open", ...([] as Arguments<Events["open"]>));
    if (this.params.flushOnOpen) this.flush();
    this.readyState = WebSocketApiState.OPEN;
    this.writeLog("%cOPEN", "color:green;font-weight:bold;", evt);
  }

  protected _onMessage({ data }: MessageEvent): void {
    this.emit("data", ...([data] as Arguments<Events["data"]>));
    this.writeLog("%cMESSAGE", "color:black;font-weight:bold;", data);
  }

  protected _onError(evt: Event) {
    this.writeLog("%cERROR", "color:red;font-weight:bold;", evt);
  }

  protected _onClose(evt: CloseEvent) {
    const error = evt.code !== 1000 || !evt.wasClean;

    if (error) {
      const { reconnectDelay } = this.params;

      if (reconnectDelay && this.socket) {
        const url = this.socket.url;

        this.writeLog("will reconnect in", `${reconnectDelay}s`);

        this.reconnectTimer = window.setTimeout(() => this.connect(url), reconnectDelay * 1000);
        this.readyState = WebSocketApiState.RECONNECTING;
      }
    } else {
      this.readyState = WebSocketApiState.CLOSED;
      this.emit("close", ...([] as Arguments<Events["close"]>));
    }
    this.writeLog("%cCLOSE", `color:${error ? "red" : "black"};font-weight:bold;`, evt);
  }

  protected writeLog(...data: any[]) {
    if (this.params.logging) {
      console.debug(...data);
    }
  }
}
