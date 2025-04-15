/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { NodeApi } from "@freelensapp/kube-api";
import type { Node } from "@freelensapp/kube-object";
import autoBind from "auto-bind";
import { sum } from "lodash";
import { computed, makeObservable } from "mobx";
import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class NodeStore extends KubeObjectStore<Node, NodeApi> {
  constructor(dependencies: KubeObjectStoreDependencies, api: NodeApi, opts?: KubeObjectStoreOptions) {
    super(dependencies, api, opts);

    makeObservable(this);
    autoBind(this);
  }

  @computed get masterNodes() {
    return this.items.filter((node) => node.isMasterNode());
  }

  @computed get workerNodes() {
    return this.items.filter((node) => !node.isMasterNode());
  }

  getWarningsCount(): number {
    return sum(this.items.map((node) => node.getWarningConditions().length));
  }
}
