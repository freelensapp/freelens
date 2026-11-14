/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { acceptedProtocolSchemes, branding, isAcceptedProtocol, isDeepLinkUrl } from "./branding";

const appDirectory = path.resolve(import.meta.dirname, "../../../../freelens");

interface ElectronBuilderConfig {
  protocols: { schemes: string[] };
  linux: { appId: string; executableName: string };
  mac: { appId: string };
  win: { appId: string };
  deb: { fpm: string[] };
  rpm: { fpm: string[] };
}

const packageJson = JSON.parse(readFileSync(path.join(appDirectory, "package.json"), "utf-8")) as {
  productName: string;
};
const electronBuilder = yaml.load(
  readFileSync(path.join(appDirectory, "electron-builder.yml"), "utf-8"),
) as ElectronBuilderConfig;

describe("branding", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(branding)).toBe(true);
    expect(Object.isFrozen(branding.legacyProtocolSchemes)).toBe(true);
    expect(Object.isFrozen(branding.upstream)).toBe(true);
  });

  it("has the product name of the application package", () => {
    expect(packageJson.productName).toBe(branding.productName);
  });

  it.each(["linux", "mac", "win"] as const)("has the app id that electron-builder uses for %s", (platform) => {
    expect(electronBuilder[platform].appId).toBe(branding.appId);
  });

  it("registers only its own protocol scheme, not the legacy ones", () => {
    expect(electronBuilder.protocols.schemes).toEqual([branding.protocolScheme]);
  });

  it("installs the Linux metainfo under the app id", () => {
    const metainfo = `/usr/share/metainfo/${branding.appId}.metainfo.xml`;

    expect(electronBuilder.deb.fpm).toContain(`./build/metainfo.xml=${metainfo}`);
    expect(electronBuilder.rpm.fpm).toContain(`./build/metainfo.xml=${metainfo}`);
  });

  it("names the Linux executable after the protocol scheme", () => {
    expect(electronBuilder.linux.executableName).toBe(branding.protocolScheme);
  });

  it("does not install the apt repository of Freelens", () => {
    expect(electronBuilder.deb.fpm.filter((entry) => entry.includes("/etc/apt/"))).toEqual([]);
  });

  it("accepts its own scheme and the legacy schemes", () => {
    expect(acceptedProtocolSchemes).toEqual(["prolens", "freelens"]);
    expect(isAcceptedProtocol("prolens:")).toBe(true);
    expect(isAcceptedProtocol("FREELENS:")).toBe(true);
    expect(isAcceptedProtocol("openlens:")).toBe(false);
    expect(isDeepLinkUrl("prolens://app/preferences")).toBe(true);
    expect(isDeepLinkUrl("freelens://app/preferences")).toBe(true);
    expect(isDeepLinkUrl("prolens:/app")).toBe(false);
    expect(isDeepLinkUrl("--some-flag")).toBe(false);
  });
});
