/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { KubeObject } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";
import type React from "react";

import type { KubeObjectDetailsProps } from "./kube-object-details";

export interface KubeObjectDetailComponents<T extends KubeObject = any> {
  Details: React.ComponentType<KubeObjectDetailsProps<T>>;
}

/**
 * `Details` is rendered with {@link KubeObjectDetailsProps} and nothing else.
 * The default leaves the object `any`, because the host renders the component
 * only for the `kind` and `apiVersions` registered, so a component typed for
 * that resource, such as `KubeObjectDetailsProps<Pod>`, fits. Nothing here
 * checks that the component was written for that resource, though;
 * `Renderer.K8sApi.detailsFor` builds the registration from the model class and
 * does.
 */
export interface KubeObjectDetailRegistration<T extends KubeObject = any> {
  kind: string;
  apiVersions: string[];
  components: KubeObjectDetailComponents<T>;
  priority?: number;
  visible?: IComputedValue<boolean>;
}
