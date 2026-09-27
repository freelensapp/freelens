/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Code that both entry points bundle, so it may only use what both runtimes
// have: the ECMAScript library, plus the few web globals Node and a browser
// page share. `src/main/tsconfig.json` and `src/renderer/tsconfig.json` both
// include this directory, so a Node API fails the renderer program and a DOM
// API fails the main one.

/** The URL the renderer probes on activation. Never actually requested: the host DI serves it. */
export const FIXTURE_PROBE_URL = "https://fixture.invalid/contract-probe";

/** The `Main.Ipc` / `Renderer.Ipc` channel main answers on, in one place so both ends agree on it. */
export const HOST_INFO_CHANNEL = "host-info";

export interface HostInfo {
  platform: string;
  requestId: string;
  probeHost: string;
}

/** A fresh id, from the Web Crypto global both processes have — never `node:crypto`. */
export const createRequestId = (): string => globalThis.crypto.randomUUID();

/** The host part of the probe URL, through the WHATWG `URL` both processes have. */
export const getProbeHost = (): string => new URL(FIXTURE_PROBE_URL).host;
