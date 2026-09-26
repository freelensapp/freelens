/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The tests run under Node, so each expectation is what `node:crypto` computes
// for the same input: these functions replace it in renderer code, and have to
// give the same bytes.
import crypto from "node:crypto";
import { createHash, sha256Hex } from "./sha256";

const nodeSha256Hex = (data: string | Uint8Array) => crypto.createHash("sha256").update(data).digest("hex");

// The helper quoted in the issue, as the fluxcd extension has it.
const nodeCreateHash = (data: unknown) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(data) as string)
    .digest("hex")
    .substring(0, 16);

describe("sha256Hex", () => {
  it.each([
    ["an ASCII string", "hello world"],
    ["a non-ASCII string", "Grüße 😀 café — 日本語"],
    ["an empty string", ""],
    ["a string longer than one SHA-256 block", "freelens ".repeat(100)],
    ["a string with a lone surrogate", "a\uD800b"],
  ])("matches node:crypto for %s", (_, data) => {
    expect(sha256Hex(data)).toBe(nodeSha256Hex(data));
  });

  it.each([
    ["a Uint8Array", new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff])],
    ["an empty Uint8Array", new Uint8Array()],
    ["a Buffer", Buffer.from("hello world", "utf-8")],
  ])("matches node:crypto for %s", (_, data) => {
    expect(sha256Hex(data)).toBe(nodeSha256Hex(data));
  });

  it("returns the known digest of 'abc'", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("returns 64 lowercase hex characters", () => {
    expect(sha256Hex("hello world")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("createHash", () => {
  it.each([
    ["an object", { apiVersion: "helm.toolkit.fluxcd.io/v2", kind: "HelmRelease", spec: { chart: "podinfo" } }],
    ["an array", [1, "two", { three: 3 }, null]],
    ["a string", "podinfo"],
    ["a non-ASCII string", "Grüße 😀"],
    ["a number", 42],
    ["null", null],
  ])("matches node:crypto for %s", (_, data) => {
    expect(createHash(data)).toBe(nodeCreateHash(data));
  });

  it("returns 16 lowercase hex characters", () => {
    expect(createHash({ a: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });

  it("depends on the key order of an object", () => {
    expect(createHash({ a: 1, b: 2 })).not.toBe(createHash({ b: 2, a: 1 }));
  });

  it.each([
    ["undefined", undefined],
    ["a function", () => {}],
    ["a symbol", Symbol("key")],
  ])("throws a TypeError for %s, as node:crypto does", (_, data) => {
    expect(() => nodeCreateHash(data)).toThrow(TypeError);
    expect(() => createHash(data)).toThrow(TypeError);
  });
});
