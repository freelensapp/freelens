/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import proxyDownloadJsonInjectable from "../fetch/download-json/proxy.injectable";
import { withTimeout } from "../fetch/timeout-controller";

interface NpmRegistryPackageMetadata {
  version: string;
}

const getLatestVersionInjectable = getInjectable({
  id: "get-latest-version",
  instantiate: (di) => {
    const proxyDownloadJson = di.inject(proxyDownloadJsonInjectable);

    return async (name: string): Promise<string> => {
      const timeoutController = withTimeout(5000);
      const result = await proxyDownloadJson(`https://registry.npmjs.org/${name}/latest`, {
        signal: timeoutController.signal,
      });
      if (!result.callWasSuccessful) {
        throw new Error(`Failed to fetch latest version: ${result}`);
      }
      const data = (await result.response) as unknown as NpmRegistryPackageMetadata;
      if (typeof data !== "object" || typeof data.version !== "string") {
        throw new Error("Invalid response from npm registry");
      }
      return data.version;
    };
  },
});

export default getLatestVersionInjectable;
