/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `Main.Util.fetch` handed to a bundled library as its `fetch` option, the way
// an extension keeps an SDK or an MCP transport on the host's client. The
// library below stands in for one: it types the option with the standard
// `fetch` and sends a `Request` of its own making, so the option has to take
// `Main.Util.fetch` without an assertion, and the host's client has to get the
// request's method, headers and body.

import { Main } from "@freelensapp/extensions";
import { FIXTURE_PROBE_URL } from "../common/host-info";

interface LibraryOptions {
  fetch?: typeof globalThis.fetch;
}

const createLibraryClient = ({ fetch = globalThis.fetch }: LibraryOptions = {}) => ({
  send: (body: string) =>
    fetch(new Request(FIXTURE_PROBE_URL, { method: "POST", headers: { "content-type": "application/json" }, body })),
});

/** Sends the probe through a library given `Main.Util.fetch`, and answers with the status of the response. */
export const probeHostFetch = async (): Promise<number> => {
  const response = await createLibraryClient({ fetch: Main.Util.fetch }).send('{"probe":true}');

  return response.status;
};
