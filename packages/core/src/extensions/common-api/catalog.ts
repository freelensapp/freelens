/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import type { KubernetesClusterCategory } from "../../common/catalog-entities/kubernetes-cluster";
import kubernetesClusterCategoryInjectable from "../../common/catalog/categories/kubernetes-cluster.injectable";

export {
  KubernetesCluster,
  GeneralEntity,
  WebLink,
} from "../../common/catalog-entities";

export type { KubernetesClusterCategory };

export const kubernetesClusterCategory = asLegacyGlobalForExtensionApi(kubernetesClusterCategoryInjectable);

export type {
  KubernetesClusterPrometheusMetrics,
  KubernetesClusterSpec,
  KubernetesClusterMetadata,
  WebLinkSpec,
  WebLinkStatus,
  WebLinkStatusPhase,
  KubernetesClusterStatusPhase,
  KubernetesClusterStatus,
  GeneralEntitySpec,
} from "../../common/catalog-entities";

export * from "../../common/catalog/catalog-entity";
