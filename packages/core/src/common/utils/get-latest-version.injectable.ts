/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import proxyFetchInjectable from "../fetch/proxy-fetch.injectable";
import { withTimeout } from "../fetch/timeout-controller";

const getLatestVersionInjectable = getInjectable({
  id: "get-latest-version",
  instantiate: (di) => {
    const proxyFetch = di.inject(proxyFetchInjectable);

    return async (name: string): Promise<string> => {
      const timeoutController = withTimeout(5000);
      const response = await proxyFetch(`https://registry.npmjs.org/${name}/latest`, {
        signal: timeoutController.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch latest version: ${response.statusText}`);
      }
      const data: any = await response.json();
      if (!data || !data.version || typeof data.version !== "string") {
        throw new Error("Invalid response from npm registry");
      }
      return data.version;
    };
  },
});

export default getLatestVersionInjectable;
