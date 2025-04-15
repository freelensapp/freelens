/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ValidatingWebhookConfigurationApi } from "@freelensapp/kube-api";
import type { ValidatingWebhookConfiguration } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class ValidatingWebhookConfigurationStore extends KubeObjectStore<
  ValidatingWebhookConfiguration,
  ValidatingWebhookConfigurationApi
> {}
