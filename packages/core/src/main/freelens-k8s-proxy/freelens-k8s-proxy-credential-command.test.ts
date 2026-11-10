/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import platformInjectable from "../../common/vars/platform.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import freelensK8sProxyCredentialCommandInjectable from "./freelens-k8s-proxy-credential-command.injectable";
import freeLensK8sProxyPathInjectable from "./freelens-k8s-proxy-path.injectable";

const credentialCommandOn = (platform: "darwin" | "linux" | "win32") => {
  const di = getDiForUnitTesting();

  di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
  di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
  di.override(platformInjectable, () => platform);
  di.override(normalizedPlatformInjectable, () => (platform === "win32" ? "windows" : platform));
  di.override(freeLensK8sProxyPathInjectable, () => "/some-bin/freelens-k8s-proxy");

  return di.inject(freelensK8sProxyCredentialCommandInjectable);
};

describe("the command of the credential plugin in the proxy kubeconfig", () => {
  it("is the absolute path of the bundled binary on macOS", () => {
    expect(credentialCommandOn("darwin")).toBe("/some-bin/freelens-k8s-proxy");
  });

  it("is the absolute path of the bundled binary on Linux", () => {
    expect(credentialCommandOn("linux")).toBe("/some-bin/freelens-k8s-proxy");
  });

  it("is the file name with its extension on Windows, for a kubectl in WSL to find on PATH", () => {
    expect(credentialCommandOn("win32")).toBe("freelens-k8s-proxy.exe");
  });
});
