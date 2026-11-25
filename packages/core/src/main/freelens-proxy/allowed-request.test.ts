/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { hasAllowedHost, hasAllowedOrigin } from "./allowed-request";

describe("hasAllowedHost", () => {
  it.each([
    "127.0.0.1",
    "127.0.0.1:54647",
    "renderer.freelens.app:54647",
    "some-cluster-id.renderer.freelens.app:54647",
  ])("accepts %s", (host) => {
    expect(hasAllowedHost({ host })).toBe(true);
    expect(hasAllowedHost({ ":authority": host })).toBe(true);
  });

  it.each(["evil.example.com:54647", "localhost:54647", "renderer.freelens.app.evil.com", ""])("refuses %s", (host) => {
    expect(hasAllowedHost({ host })).toBe(false);
  });

  it("refuses a missing host", () => {
    expect(hasAllowedHost({})).toBe(false);
  });
});

describe("hasAllowedOrigin", () => {
  it("accepts a request with no origin", () => {
    expect(hasAllowedOrigin({})).toBe(true);
  });

  it.each(["https://renderer.freelens.app:54647", "https://some-cluster-id.renderer.freelens.app:54647"])(
    "accepts the frame origin %s",
    (origin) => {
      expect(hasAllowedOrigin({ origin })).toBe(true);
    },
  );

  it.each(["https://evil.example.com", "http://renderer.freelens.app:54647", "https://renderer.freelens.app.evil.com"])(
    "refuses %s",
    (origin) => {
      expect(hasAllowedOrigin({ origin })).toBe(false);
    },
  );
});
