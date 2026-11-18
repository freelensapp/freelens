/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeConfig } from "@kubernetes/client-node";

import type { KubeConfigData } from "../../common/kube-config";

/**
 * The `KubeConfig` of @kubernetes/client-node for a parsed kubeconfig, for the
 * clients of main that make requests with it.
 */
export function toClientKubeConfig({ clusters, users, contexts, currentContext }: KubeConfigData): KubeConfig {
  const kubeConfig = new KubeConfig();

  kubeConfig.loadFromOptions({ clusters, users, contexts, currentContext });

  return kubeConfig;
}
