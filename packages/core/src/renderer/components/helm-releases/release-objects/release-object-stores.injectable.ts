/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiKubeInjectionToken } from "@freelensapp/kube-api";
import {
  logDebugInjectionToken,
  logErrorInjectionToken,
  loggerInjectionToken,
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import createKubeJsonApiInjectable from "../../../../common/k8s-api/create-kube-json-api.injectable";
import { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../cluster-frame-context/for-namespaced-resources.injectable";
import watchReconnectInjectable from "../../../k8s/watch-reconnect/watch-reconnect.injectable";
import { HelmReleaseObjectApi, metadataWatchAccept } from "./helm-release-object-api";

import type { HelmReleaseObject } from "./helm-release-object-api";

export type HelmReleaseObjectStore = KubeObjectStore<HelmReleaseObject, HelmReleaseObjectApi>;

/**
 * Stores of the metadata of the Secrets and the ConfigMaps of Helm's storage.
 * They are registered nowhere, so the Secrets and ConfigMaps views keep their
 * own stores, with the data.
 */
const releaseObjectStoresInjectable = getInjectable({
  id: "release-object-stores",

  instantiate: (di): HelmReleaseObjectStore[] => {
    const apiKube = di.inject(apiKubeInjectionToken);
    const request = di.inject(createKubeJsonApiInjectable)(
      { ...apiKube.config },
      { headers: { accept: metadataWatchAccept } },
    );
    const apiDependencies = {
      logDebug: di.inject(logDebugInjectionToken),
      logError: di.inject(logErrorInjectionToken),
      logInfo: di.inject(logInfoInjectionToken),
      logWarn: di.inject(logWarningInjectionToken),
      maybeKubeApi: apiKube,
    };
    const storeDependencies = {
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
      watchReconnect: di.inject(watchReconnectInjectable),
      logger: di.inject(loggerInjectionToken),
    };

    return [
      new HelmReleaseObjectApi(apiDependencies, { kind: "Secret", apiBase: "/api/v1/secrets", request }),
      new HelmReleaseObjectApi(apiDependencies, { kind: "ConfigMap", apiBase: "/api/v1/configmaps", request }),
    ].map((api) => new KubeObjectStore<HelmReleaseObject, HelmReleaseObjectApi>(storeDependencies, api));
  },
});

export default releaseObjectStoresInjectable;
