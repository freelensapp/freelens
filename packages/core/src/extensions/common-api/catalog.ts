/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import kubernetesClusterCategoryInjectable from "../../common/catalog/categories/kubernetes-cluster.injectable";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

import type { KubernetesClusterCategory } from "../../common/catalog-entities/kubernetes-cluster";

export {
  GeneralEntity,
  KubernetesCluster,
  WebLink,
} from "../../common/catalog-entities";

export type { KubernetesClusterCategory };

export const kubernetesClusterCategory = asLazyInjectedForExtensionApi(kubernetesClusterCategoryInjectable);

export * from "../../common/catalog/catalog-entity";

export type {
  GeneralEntitySpec,
  KubernetesClusterMetadata,
  KubernetesClusterPrometheusMetrics,
  KubernetesClusterSpec,
  KubernetesClusterStatus,
  KubernetesClusterStatusPhase,
  WebLinkSpec,
  WebLinkStatus,
  WebLinkStatusPhase,
} from "../../common/catalog-entities";
