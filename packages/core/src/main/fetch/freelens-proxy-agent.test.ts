/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createServer, type Server } from "node:http";
import { Agent, fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withBearerToken } from "./freelens-proxy-agent";
import type { AddressInfo } from "node:net";

describe("withBearerToken", () => {
  let server: Server;
  let url: string;
  let received: string | undefined;
  let agent: Agent;

  beforeEach(async () => {
    received = undefined;
    server = createServer((req, res) => {
      received = req.headers.authorization;
      res.end("{}");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/some-path`;
    agent = new Agent();
  });

  afterEach(async () => {
    await agent.destroy();
    await new Promise((resolve) => server.close(resolve));
  });

  it("adds the bearer token to a request with no headers", async () => {
    await undiciFetch(url, { dispatcher: agent.compose(withBearerToken("some-token")) });

    expect(received).toBe("Bearer some-token");
  });

  it("adds the bearer token next to other headers", async () => {
    await undiciFetch(url, {
      dispatcher: agent.compose(withBearerToken("some-token")),
      headers: { "x-some-header": "some-value" },
    });

    expect(received).toBe("Bearer some-token");
  });

  it("replaces an authorization header already present, not appends a second", async () => {
    await undiciFetch(url, {
      dispatcher: agent.compose(withBearerToken("some-token")),
      headers: { authorization: "Bearer other-token" },
    });

    expect(received).toBe("Bearer some-token");
  });
});
