/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `Util.standardFetch` is the host's `fetch` typed as the standard one, for a
// bundled library that takes a `fetch` option (C12 in docs/extensions/api.md).
// It has to reach the host's client, hand the response over untouched, and
// refuse what it cannot pass on without losing it.

import { beforeEach, describe, expect, it, vi } from "vitest";
import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { asStandardFetch } from "../common-api/standard-fetch";
import * as Main from "../main-api";

import type { Fetch } from "@freelensapp/json-api";

import type { Mock } from "vitest";

describe("asStandardFetch", () => {
  let hostFetch: Mock<Fetch>;
  let standardFetch: typeof globalThis.fetch;
  const response = new Response("some-body", { status: 201 });

  beforeEach(() => {
    hostFetch = vi.fn<Fetch>(async () => response);
    standardFetch = asStandardFetch(hostFetch);
  });

  it("passes a string URL and the init to the host's fetch, and hands its response over as it is", async () => {
    const init = { method: "POST", headers: { "content-type": "text/plain" }, body: "some-request" };

    await expect(standardFetch("https://some.invalid/path", init)).resolves.toBe(response);
    expect(hostFetch).toHaveBeenCalledWith("https://some.invalid/path", init);
  });

  it("passes a URL object as it is", async () => {
    const url = new URL("https://some.invalid/path");

    await standardFetch(url);

    expect(hostFetch).toHaveBeenCalledWith(url, undefined);
  });

  it("passes the fields of the init the structural contract does not name", async () => {
    const body = new URLSearchParams({ some: "value" });

    await standardFetch("https://some.invalid/path", { method: "POST", body, redirect: "manual" });

    expect(hostFetch).toHaveBeenCalledWith("https://some.invalid/path", { method: "POST", body, redirect: "manual" });
  });

  it("drops a dispatcher, which would replace the host's", async () => {
    const init = { method: "GET", dispatcher: { some: "dispatcher" } } as RequestInit;

    await standardFetch("https://some.invalid/path", init);

    expect(hostFetch).toHaveBeenCalledWith("https://some.invalid/path", { method: "GET" });
  });

  it("refuses a Request, whose method, headers and body would be lost", async () => {
    const request = new Request("https://some.invalid/path", { method: "POST", body: "some-request" });

    await expect(standardFetch(request)).rejects.toThrow(TypeError);
    expect(hostFetch).not.toHaveBeenCalled();
  });
});

describe("Main.Util.standardFetch", () => {
  it("reaches the host's client in main", async () => {
    const di = getDiForUnitTesting();
    const response = new Response(null, { status: 204 });
    const proxyFetch = vi.fn<Fetch>(async () => response);

    di.override(proxyFetchInjectable, () => proxyFetch);

    await expect(Main.Util.standardFetch("https://some.invalid/path")).resolves.toBe(response);
    expect(proxyFetch).toHaveBeenCalledWith("https://some.invalid/path", undefined);
  });
});
