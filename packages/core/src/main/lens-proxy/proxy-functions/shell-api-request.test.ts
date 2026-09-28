/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import openShellSessionInjectable from "../../shell-session/create-shell-session.injectable";
import getClusterForRequestInjectable from "../get-cluster-for-request.injectable";
import shellApiRequestInjectable from "./shell-api-request.injectable";
import { standaloneShellScope } from "./shell-request-authenticator/shell-request-authenticator";
import shellRequestAuthenticatorInjectable from "./shell-request-authenticator/shell-request-authenticator.injectable";
import type net from "node:net";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ServerIncomingMessage } from "../lens-proxy";

vi.mock("ws", () => ({
  WebSocketServer: class {
    handleUpgrade(
      _req: unknown,
      _socket: unknown,
      _head: unknown,
      callback: (websocket: Record<string, unknown>) => void,
    ) {
      callback({ send: () => {} });
    }
  },
}));

describe("shell api requests", () => {
  let di: DiContainer;
  let openShellSession: Mock;
  let authenticate: Mock;
  let socket: { write: Mock; end: Mock };

  const request = (url: string) => {
    di.inject(shellApiRequestInjectable)({
      req: { url, method: "GET", headers: {} } as ServerIncomingMessage,
      socket: socket as Partial<net.Socket> as net.Socket,
      head: Buffer.from([]),
      cluster: undefined,
    });
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");

    openShellSession = vi.fn(async () => {});
    authenticate = vi.fn(() => true);
    socket = { write: vi.fn(), end: vi.fn() };

    di.override(openShellSessionInjectable, () => openShellSession);
    di.override(getClusterForRequestInjectable, () => () => ({ id: "some-cluster-id" }) as Cluster);
    di.override(
      shellRequestAuthenticatorInjectable,
      () => ({ authenticate }) as Partial<{ authenticate: Mock }> as never,
    );
  });

  it("authenticates a standalone request against the standalone scope and opens a session with no cluster", () => {
    request("/api?id=some-tab-id&type=standalone&shellToken=some-token");

    expect(authenticate).toHaveBeenCalledWith(standaloneShellScope, "some-tab-id", "some-token");
    expect(openShellSession).toHaveBeenCalledWith(
      expect.objectContaining({ cluster: undefined, tabId: "some-tab-id" }),
    );
  });

  it("authenticates a cluster request against its cluster and opens a session with it", () => {
    request("/api?id=some-tab-id&shellToken=some-token");

    expect(authenticate).toHaveBeenCalledWith("some-cluster-id", "some-tab-id", "some-token");
    expect(openShellSession).toHaveBeenCalledWith(
      expect.objectContaining({ cluster: { id: "some-cluster-id" }, tabId: "some-tab-id" }),
    );
  });

  it("rejects a request whose token does not authenticate", () => {
    authenticate.mockReturnValue(false);

    request("/api?id=some-tab-id&type=standalone&shellToken=some-token");

    expect(openShellSession).not.toHaveBeenCalled();
    expect(socket.write).toHaveBeenCalledWith("Invalid shell request");
    expect(socket.end).toHaveBeenCalled();
  });

  it("ignores a node name on a standalone request, since a node shell needs a cluster", () => {
    request("/api?id=some-tab-id&type=standalone&node=some-node&shellToken=some-token");

    expect(openShellSession).toHaveBeenCalledWith(expect.objectContaining({ nodeName: undefined }));
  });
});
