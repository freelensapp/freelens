/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { MutatingWebhookConfiguration } from "@freelens/kube-object";
import type { MutatingWebhookConfigurationApi } from "@freelens/kube-api";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class MutatingWebhookConfigurationStore extends KubeObjectStore<MutatingWebhookConfiguration, MutatingWebhookConfigurationApi> {
}
