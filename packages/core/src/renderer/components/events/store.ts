/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import autoBind from "auto-bind";
import compact from "lodash/compact";
import groupBy from "lodash/groupBy";
import { computed } from "mobx";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { KubeEventApi } from "@freelensapp/kube-api";
import type { KubeEvent, KubeObject } from "@freelensapp/kube-object";

import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import type { GetPodById } from "../workloads-pods/get-pod-by-id.injectable";

export interface EventStoreDependencies extends KubeObjectStoreDependencies {
  getPodById: GetPodById;
}

export class EventStore extends KubeObjectStore<KubeEvent, KubeEventApi> {
  public declare readonly limit: number;

  constructor(
    protected readonly dependencies: EventStoreDependencies,
    api: KubeEventApi,
    opts: KubeObjectStoreOptions = {},
  ) {
    super(dependencies, api, { limit: 1000, ...opts });
    autoBind(this);
  }

  protected bindWatchEventsUpdater() {
    return super.bindWatchEventsUpdater(5000);
  }

  protected sortItems(items: KubeEvent[]) {
    return super.sortItems(
      items,
      [
        (event) => -event.getCreationTimestamp(), // keep events order as timeline ("fresh" on top)
      ],
      "asc",
    );
  }

  @computed get eventsByObjectId(): Map<string, KubeEvent[]> {
    const map = new Map<string, KubeEvent[]>();

    for (const evt of this.items) {
      const uid = evt.involvedObject.uid;
      let bucket = map.get(uid);

      if (!bucket) {
        bucket = [];
        map.set(uid, bucket);
      }

      bucket.push(evt);
    }

    return map;
  }

  getEventsByObject(obj: KubeObject): KubeEvent[] {
    if (obj.kind == "Node") {
      // Node events are stored with involvedObject.uid equal to the node name
      return (this.eventsByObjectId.get(obj.getName()) ?? []).filter(
        (evt) => evt.involvedObject.kind == "Node",
      );
    }

    return this.eventsByObjectId.get(obj.getId()) ?? [];
  }

  getWarnings() {
    const warnings = this.items.filter((event) => event.type == "Warning");
    const groupsByInvolvedObject = groupBy(warnings, (warning) => warning.involvedObject.uid);
    const eventsWithError = Object.values(groupsByInvolvedObject).map((events) => {
      const recent = events[0];
      const { kind, uid } = recent.involvedObject;

      if (kind == Pod.kind) {
        // Wipe out running pods
        const pod = this.dependencies.getPodById(uid);

        if (!pod || (!pod.hasIssues() && (pod.spec?.priority ?? 0) < 500000)) {
          return undefined;
        }
      }

      return recent;
    });

    return compact(eventsWithError);
  }

  getWarningsCount() {
    return this.getWarnings().length;
  }
}
