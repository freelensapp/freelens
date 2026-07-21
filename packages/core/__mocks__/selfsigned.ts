/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// `selfsigned` v5 exposes an async, native WebCrypto based `generate()` that
// runs an RSA key generation job on the libuv threadpool. When a Vitest worker
// (core runs on `pool: "threads"`) is torn down at end of a test file while
// such a job is still in flight, Node aborts the worker with
// `Assertion failed: try_catch.CanContinue()` (exit code 129) in
// crypto_keygen.h. Because the startup runnable `setup-lens-proxy-certificate`
// fires this keygen for every test that bootstraps the full main-app DI, and
// the failing shard depends on how files are distributed, this surfaces as a
// non-deterministic (flaky) crash.
//
// This mock replaces the native keygen with a static certificate resolved
// synchronously, so no real RSA key is ever generated inside a worker. Tests
// that assert on certificate contents override the certificate injectables and
// never observe these placeholder values.

import type { SelfSignedCert } from "../src/common/certificate/certificate";

const staticCert: SelfSignedCert = {
  private: "-----BEGIN PRIVATE KEY-----\nMOCK-SELFSIGNED-PRIVATE-KEY\n-----END PRIVATE KEY-----",
  public: "-----BEGIN PUBLIC KEY-----\nMOCK-SELFSIGNED-PUBLIC-KEY\n-----END PUBLIC KEY-----",
  cert: "-----BEGIN CERTIFICATE-----\nMOCK-SELFSIGNED-CERTIFICATE\n-----END CERTIFICATE-----",
};

export const generate = async (): Promise<SelfSignedCert> => staticCert;

export default { generate };
