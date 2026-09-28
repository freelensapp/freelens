/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import createStandaloneTerminalApiInjectable from "../create-standalone-terminal-api.injectable";
import requestStandaloneShellTokenInjectable from "../request-standalone-shell-token.injectable";
import { WebSocketApi } from "../websocket-api";

describe("the terminal api of a shell that belongs to no cluster", () => {
  it("asks for a standalone shell, with the token minted for its own tab", async () => {
    const di = getDiForUnitTesting();
    const requestShellToken = vi.fn(async () => Uint8Array.from([1, 2, 3]));

    di.override(requestStandaloneShellTokenInjectable, () => requestShellToken);

    const connect = vi.spyOn(WebSocketApi.prototype, "connect").mockImplementation(() => {});
    const api = di.inject(createStandaloneTerminalApiInjectable)("some-tab-id");

    await api.connect();

    expect(requestShellToken).toHaveBeenCalledWith("some-tab-id");

    const url = new URL(connect.mock.calls[0][0]);

    expect(url.pathname).toBe("/api");
    expect(url.searchParams.get("type")).toBe("standalone");
    expect(url.searchParams.get("id")).toBe("some-tab-id");
    expect(url.searchParams.get("shellToken")).toBe(Buffer.from([1, 2, 3]).toString("base64"));

    connect.mockRestore();
  });
});
