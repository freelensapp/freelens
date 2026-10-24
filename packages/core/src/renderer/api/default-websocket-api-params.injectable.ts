/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { TerminalChannels } from "../../common/terminal/channels";
import isDevelopmentInjectable from "../../common/vars/is-development.injectable";

import type { TerminalMessage } from "../../common/terminal/channels";

// Written out rather than derived from the injectable: `WebSocketApi` exposes it
// to extensions, and a type derived through `instantiate` would make the
// published declaration import the DI library.
export type DefaultWebsocketApiParams = {
  logging: boolean;
  reconnectDelay: number;
  flushOnOpen: boolean;
  pingMessage: string;
};

const defaultWebsocketApiParamsInjectable = getInjectable({
  id: "default-websocket-api-params",
  instantiate: (di): DefaultWebsocketApiParams => ({
    logging: di.inject(isDevelopmentInjectable),
    reconnectDelay: 10,
    flushOnOpen: true,
    pingMessage: JSON.stringify({ type: TerminalChannels.PING } as TerminalMessage),
  }),
});

export default defaultWebsocketApiParamsInjectable;
