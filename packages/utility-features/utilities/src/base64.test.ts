/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { base64 } from "./base64";

describe("base64", () => {
  it("encodes utf-8 to base64", () => {
    expect(base64.encode("hello world")).toBe("aGVsbG8gd29ybGQ=");
  });

  it("decodes base64 to utf-8", () => {
    expect(base64.decode("aGVsbG8gd29ybGQ=")).toBe("hello world");
  });

  it("round-trips multibyte utf-8 characters", () => {
    const value = "Grüße 😀 café";

    expect(base64.decode(base64.encode(value))).toBe(value);
  });

  it("encodes an empty string", () => {
    expect(base64.encode("")).toBe("");
    expect(base64.decode("")).toBe("");
  });

  it("throws when decoding input that is not valid base64-encoded utf-8", () => {
    // Callers (e.g. secret-key.tsx) rely on this to fall back to the raw value.
    expect(() => base64.decode("some-data-for-some-key")).toThrow();
  });
});
