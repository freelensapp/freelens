/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createServer, type Server } from "node:http";
import { fetch as undiciFetch } from "undici";
import { withHostHeaderPreserved } from "./host-header-dispatcher";
import type { AddressInfo } from "node:net";

import type { FetchRequestInit as RequestInit } from "@freelensapp/json-api";

import type { RequestInit as UndiciRequestInit } from "undici";

describe("withHostHeaderPreserved", () => {
  let server: Server;
  let url: string;
  let receivedHost: string | undefined;

  beforeEach(async () => {
    server = createServer((req, res) => {
      receivedHost = req.headers.host;
      res.setHeader("content-type", "application/json");
      res.end("{}");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/some-path`;
    receivedHost = undefined;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const request = async (init: RequestInit) => {
    await undiciFetch(url, withHostHeaderPreserved(init) as UndiciRequestInit);

    return receivedHost;
  };

  // lens-proxy routes to a cluster on this header, so losing it breaks every
  // cluster view. undici's `fetch` drops it on its own: it is a forbidden
  // header name.
  it("sends a Host header given as a record", async () => {
    expect(await request({ headers: { Host: "some-cluster-id.renderer.freelens.app" } })).toBe(
      "some-cluster-id.renderer.freelens.app",
    );
  });

  it("sends a lower-cased host header given as a record", async () => {
    expect(await request({ headers: { host: "some-cluster-id.renderer.freelens.app" } })).toBe(
      "some-cluster-id.renderer.freelens.app",
    );
  });

  it("sends a Host header given as a list of entries", async () => {
    expect(await request({ headers: [["Host", "some-cluster-id.renderer.freelens.app"]] })).toBe(
      "some-cluster-id.renderer.freelens.app",
    );
  });

  it("sends a Host header given as a Headers instance", async () => {
    expect(await request({ headers: new Headers({ Host: "some-cluster-id.renderer.freelens.app" }) })).toBe(
      "some-cluster-id.renderer.freelens.app",
    );
  });

  it("keeps the other headers", async () => {
    let contentType: string | undefined;

    server.removeAllListeners("request");
    server.on("request", (req, res) => {
      receivedHost = req.headers.host;
      contentType = req.headers["content-type"];
      res.end("{}");
    });

    expect(
      await request({
        headers: { Host: "some-cluster-id.renderer.freelens.app", "content-type": "application/json" },
      }),
    ).toBe("some-cluster-id.renderer.freelens.app");
    expect(contentType).toBe("application/json");
  });

  it("defaults the Host header to the authority when none is given", async () => {
    const port = (server.address() as AddressInfo).port;

    expect(await request({ headers: { "content-type": "application/json" } })).toBe(`127.0.0.1:${port}`);
  });

  it("does not touch an init without a Host header", () => {
    const init: RequestInit = { headers: { "content-type": "application/json" } };

    expect(withHostHeaderPreserved(init)).toBe(init);
  });

  it("does not touch an undefined init", () => {
    expect(withHostHeaderPreserved(undefined)).toBeUndefined();
  });
});
