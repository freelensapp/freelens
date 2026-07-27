/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ShellRequestAuthenticator, standaloneShellScope } from "./shell-request-authenticator";

import type Electron from "electron";

type Handler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any;

const handlers = new Map<string, Handler>();

vi.mock("../../../../common/ipc", () => ({
  ipcMainHandle: (channel: string, handler: Handler) => void handlers.set(channel, handler),
}));

describe("shell request authenticator", () => {
  let authenticator: ShellRequestAuthenticator;

  const mint = async (channel: string, ...args: unknown[]) => {
    const handler = handlers.get(channel);

    if (!handler) {
      throw new Error(`no handler was registered for ${channel}`);
    }

    const token = (await handler({} as Electron.IpcMainInvokeEvent, ...args)) as Uint8Array;

    return Buffer.from(token).toString("base64");
  };

  beforeEach(() => {
    handlers.clear();
    authenticator = new ShellRequestAuthenticator();
    authenticator.init();
  });

  it("authenticates a token minted for a cluster", async () => {
    const token = await mint("cluster:shell-api", "some-cluster-id", "some-tab-id");

    expect(authenticator.authenticate("some-cluster-id", "some-tab-id", token)).toBe(true);
  });

  it("authenticates a token minted for a shell that belongs to no cluster", async () => {
    const token = await mint("app:standalone-shell-api", "some-tab-id");

    expect(authenticator.authenticate(standaloneShellScope, "some-tab-id", token)).toBe(true);
  });

  it("does not authenticate the standalone scope with a token minted for a cluster", async () => {
    const token = await mint("cluster:shell-api", "some-cluster-id", "some-tab-id");

    expect(authenticator.authenticate(standaloneShellScope, "some-tab-id", token)).toBe(false);
  });

  it("does not authenticate a cluster with a token minted for the standalone scope", async () => {
    const token = await mint("app:standalone-shell-api", "some-tab-id");

    expect(authenticator.authenticate("some-cluster-id", "some-tab-id", token)).toBe(false);
  });

  it("does not authenticate another tab of the same scope", async () => {
    const token = await mint("app:standalone-shell-api", "some-tab-id");

    expect(authenticator.authenticate(standaloneShellScope, "some-other-tab-id", token)).toBe(false);
  });

  it("only authenticates a standalone token once", async () => {
    const token = await mint("app:standalone-shell-api", "some-tab-id");

    expect(authenticator.authenticate(standaloneShellScope, "some-tab-id", token)).toBe(true);
    expect(authenticator.authenticate(standaloneShellScope, "some-tab-id", token)).toBe(false);
  });
});
