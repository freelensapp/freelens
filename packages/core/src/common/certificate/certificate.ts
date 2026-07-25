/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The subset of `selfsigned`'s generate result that Freelens actually uses.
 *
 * `selfsigned` v5 ships its own types, but its `GenerateResult` interface is
 * not exported and requires fields (e.g. `fingerprint`) that we never consume
 * and that the renderer-side certificate (received over the request channel)
 * does not carry. This local type keeps the shape stable across processes.
 */
export interface SelfSignedCert {
  private: string;
  public: string;
  cert: string;
}
