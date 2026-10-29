/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import baseBundledBinariesDirectoryInjectable from "../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../common/vars/platform.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import freelensProxyTokenInjectable from "./freelens-proxy-token.injectable";
import withFreelensProxyCredentialEnvInjectable from "./with-freelens-proxy-credential-env.injectable";

const credentialEnvOn = (platform: "darwin" | "win32") => {
  const di = getDiForUnitTesting();

  di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
  di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
  di.override(platformInjectable, () => platform);
  di.override(baseBundledBinariesDirectoryInjectable, () => "C:\\some-bundled-directory");
  di.override(freelensProxyTokenInjectable, () => ({ value: "some-token", matches: () => false }));

  return di.inject(withFreelensProxyCredentialEnvInjectable);
};

describe("the environment of a tool run against the proxy kubeconfig", () => {
  it("carries the token", () => {
    expect(credentialEnvOn("darwin")({ SOME_VAR: "some-value" })).toEqual({
      SOME_VAR: "some-value",
      FREELENS_PROXY_TOKEN: "some-token",
    });
  });

  it("leaves PATH alone outside Windows, where the kubeconfig names the binary by its path", () => {
    expect(credentialEnvOn("darwin")({ PATH: "/usr/bin" }).PATH).toBe("/usr/bin");
  });

  it("appends the bundled binaries directory to Windows' Path, under the one key PATH", () => {
    const env = credentialEnvOn("win32")({ Path: "C:\\Windows" });

    expect(env).toEqual({ PATH: "C:\\Windows;C:\\some-bundled-directory", FREELENS_PROXY_TOKEN: "some-token" });
  });

  it("does not modify the environment it is given", () => {
    const given = { Path: "C:\\Windows" };

    credentialEnvOn("win32")(given);

    expect(given).toEqual({ Path: "C:\\Windows" });
  });
});
