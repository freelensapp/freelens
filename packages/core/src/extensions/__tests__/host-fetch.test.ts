/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 *
 * @vitest-environment node
 */

// `Main.Util.fetch` is the host's client typed as the standard `fetch`, for an
// extension and for a bundled library that takes a `fetch` option (C12 in
// docs/extensions/api.md). It has to reach the host's client, take what the
// standard takes, a `Request` and a `FormData` included, and keep the host's
// dispatcher.
//
// It runs in the node environment rather than core's default jsdom: the
// globals an extension's main code hands over, `Request` and `FormData`, are
// Node's there, while jsdom would replace `FormData` with its own.

import { createServer } from "node:http";
import { Agent } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import httpsAgentInjectable from "../../main/fetch/https-agent.injectable";
import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import * as Main from "../main-api";
import { asHostFetch } from "../main-api/host-fetch";
import type { IncomingHttpHeaders, Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { Fetch } from "@freelensapp/json-api";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Dispatcher } from "undici";
import type { Mock } from "vitest";

import type { HostFetch } from "../main-api/host-fetch";

describe("asHostFetch", () => {
  let proxyFetch: Mock<Fetch>;
  let hostFetch: HostFetch;
  const response = new Response("some-body", { status: 201 });

  beforeEach(() => {
    proxyFetch = vi.fn<Fetch>(async () => response);
    hostFetch = asHostFetch(proxyFetch);
  });

  it("passes a string URL and the init to the host's fetch, and hands its response over as it is", async () => {
    const init = { method: "POST", headers: { "content-type": "text/plain" }, body: "some-request" };

    await expect(hostFetch("https://some.invalid/path", init)).resolves.toBe(response);
    expect(proxyFetch).toHaveBeenCalledWith("https://some.invalid/path", init);
  });

  it("passes a URL object as it is", async () => {
    const url = new URL("https://some.invalid/path");

    await hostFetch(url);

    expect(proxyFetch).toHaveBeenCalledWith(url, {});
  });

  it("passes the fields of the init the structural contract does not name", async () => {
    const body = new URLSearchParams({ some: "value" });

    await hostFetch("https://some.invalid/path", { method: "POST", body, redirect: "manual" });

    expect(proxyFetch).toHaveBeenCalledWith("https://some.invalid/path", { method: "POST", body, redirect: "manual" });
  });

  it("drops a dispatcher, which would replace the host's", async () => {
    const init = { method: "GET", dispatcher: { some: "dispatcher" } } as RequestInit;

    await hostFetch("https://some.invalid/path", init);

    expect(proxyFetch).toHaveBeenCalledWith("https://some.invalid/path", { method: "GET" });
  });

  it("passes a Request as its URL and an init built from it", async () => {
    const request = new Request("https://some.invalid/path", {
      method: "PUT",
      headers: { "x-some": "value" },
      body: "some-request",
      redirect: "error",
    });

    await hostFetch(request);

    expect(proxyFetch).toHaveBeenCalledWith("https://some.invalid/path", {
      method: "PUT",
      headers: [
        ["content-type", "text/plain;charset=UTF-8"],
        ["x-some", "value"],
      ],
      body: request.body,
      signal: request.signal,
      redirect: "error",
      duplex: "half",
    });
  });

  it("applies the init on top of a Request, member by member, skipping undefined ones", async () => {
    const request = new Request("https://some.invalid/path", { method: "POST", headers: { "x-some": "value" } });

    await hostFetch(request, { method: "PATCH", headers: undefined, body: "other-request" });

    expect(proxyFetch).toHaveBeenCalledWith(
      "https://some.invalid/path",
      expect.objectContaining({ method: "PATCH", headers: [["x-some", "value"]], body: "other-request" }),
    );
  });
});

describe("Main.Util.fetch, against a server", () => {
  let di: DiContainer;
  let server: Server;
  let url: string;
  let received: { method?: string; headers: IncomingHttpHeaders; body: string } | undefined;
  let dispatchedThrough: string[];

  // A real dispatcher that records its name for every request it dispatches.
  const recordingDispatcher = (name: string): Dispatcher =>
    new Agent().compose((dispatch) => (options, handler) => {
      dispatchedThrough.push(name);

      return dispatch(options, handler);
    });

  beforeEach(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        received = { method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() };
        res.end("some-response");
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/some-path`;
    received = undefined;
    dispatchedThrough = [];

    di = getDiForUnitTesting();

    const hostDispatcher = recordingDispatcher("host");

    di.override(httpsAgentInjectable, () => () => hostDispatcher);
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("sends the method, headers and body of a global Request", async () => {
    const request = new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-some": "value" },
      body: JSON.stringify({ some: "value" }),
    });

    const response = await Main.Util.fetch(request);

    expect(await response.text()).toBe("some-response");
    expect(received).toEqual({
      method: "POST",
      headers: expect.objectContaining({ "content-type": "application/json", "x-some": "value" }),
      body: '{"some":"value"}',
    });
    expect(dispatchedThrough).toEqual(["host"]);
  });

  // The undici package does not recognise the global FormData either, and
  // without encoding it sends the text "[object FormData]" as text/plain.
  it("sends a global FormData body as multipart, keeping the other headers", async () => {
    const form = new FormData();

    form.append("some-field", "some-value");

    await Main.Util.fetch(url, { method: "POST", headers: { "x-some": "value" }, body: form });

    expect(received?.method).toBe("POST");
    expect(received?.headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
    expect(received?.headers["x-some"]).toBe("value");
    expect(received?.body).toContain('name="some-field"');
    expect(received?.body).toContain("some-value");
  });

  it("sends the request through the host's dispatcher, not through one in the extension's init", async () => {
    const init = { dispatcher: recordingDispatcher("extension") } as RequestInit;

    await Main.Util.fetch(url, init);

    expect(dispatchedThrough).toEqual(["host"]);
  });

  it("reaches the host's client", async () => {
    const proxyFetch = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));

    di.override(proxyFetchInjectable, () => proxyFetch);

    await expect(Main.Util.fetch(url)).resolves.toMatchObject({ status: 204 });
    expect(proxyFetch).toHaveBeenCalledWith(url, {});
  });
});
