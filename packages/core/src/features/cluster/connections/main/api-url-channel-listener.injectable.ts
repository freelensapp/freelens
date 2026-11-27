/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import clustersStateInjectable from "../../storage/common/state.injectable";
import { clusterApiUrlChannel } from "../common/api-url-channel";
import clusterApiUrlInjectable from "./api-url.injectable";

/**
 * The origin and path of the URL only: a kubeconfig may put a user name and password in the
 * server's URL, and those stay in main.
 */
const displayedApiUrl = (url: URL) => `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;

const clusterApiUrlChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "cluster-api-url-channel-listener",
  channel: clusterApiUrlChannel,
  getHandler: (di) => {
    const clustersState = di.inject(clustersStateInjectable);

    return async (clusterId) => {
      const cluster = clustersState.get(clusterId);

      if (!cluster) {
        return undefined;
      }

      try {
        return displayedApiUrl(await di.inject(clusterApiUrlInjectable, cluster)());
      } catch {
        return undefined;
      }
    };
  },
});

export default clusterApiUrlChannelListenerInjectable;
