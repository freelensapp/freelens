/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ClusterRole,
  ClusterRoleBinding,
  CustomResourceDefinition,
  Deployment,
  KubeEvent,
  Role,
  RoleBinding,
} from "@freelensapp/kube-object";
import { noop } from "@freelensapp/utilities";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ItemStore } from "../../../common/item.store";
import { CustomResourceDefinitionStore } from "../custom-resource-definitions/store";
import { EventStore } from "../events/store";
import { ClusterRoleBindingStore } from "../user-management/cluster-role-bindings/store";
import { ClusterRoleStore } from "../user-management/cluster-roles/store";
import { RoleBindingStore } from "../user-management/role-bindings/store";
import { RoleStore } from "../user-management/roles/store";
import { DeploymentStore } from "../workloads-deployments/store";

import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { PodStore } from "../workloads-pods/store";

const dependencies = {
  podStore: mock<PodStore>(),
  getPodById: () => undefined,
  context: {
    allNamespaces: ["default"],
    contextNamespaces: ["default"],
    hasSelectedAll: true,
    isGlobalWatchEnabled: () => true,
    isLoadingAll: () => true,
  },
  logger: { debug: noop, error: noop, info: noop, silly: noop, warn: noop },
};
const cases = [
  { Store: DeploymentStore, ObjectType: Deployment, extra: (rank: number) => ({ spec: { replicas: rank } }) },
  {
    Store: CustomResourceDefinitionStore,
    ObjectType: CustomResourceDefinition,
    extra: (rank: number) => ({ spec: { group: String(4 - rank) } }),
  },
  {
    Store: EventStore,
    ObjectType: KubeEvent,
    extra: (rank: number) => ({ metadata: { creationTimestamp: `2026-01-0${rank}T00:00:00Z` } }),
  },
  { Store: ClusterRoleStore, ObjectType: ClusterRole, extra: (rank: number) => ({ kind: String(4 - rank) }) },
  {
    Store: ClusterRoleBindingStore,
    ObjectType: ClusterRoleBinding,
    extra: (rank: number) => ({ kind: String(4 - rank) }),
  },
  { Store: RoleStore, ObjectType: Role, extra: (rank: number) => ({ kind: String(4 - rank) }) },
  { Store: RoleBindingStore, ObjectType: RoleBinding, extra: (rank: number) => ({ kind: String(4 - rank) }) },
];

describe.each(cases)("$Store.name watch sorting", ({ Store, ObjectType, extra }) => {
  it("declares its order instead of overriding sortItems", () => {
    expect(Store.prototype["sortItems" as never]).toBe(ItemStore.prototype["sortItems" as never]);
  });

  it("sorts only when a field used by the store's comparator changes", () => {
    vi.useFakeTimers();
    try {
      const store = new Store(dependencies, { objectConstructor: ObjectType } as never) as unknown as KubeObjectStore;
      const data = (uid: string, rank: number, version = "1") => {
        const fields = extra(rank);
        return {
          apiVersion: "v1",
          kind: "Test",
          ...fields,
          metadata: {
            uid,
            name: uid,
            resourceVersion: version,
            namespace: "default",
            selfLink: `/test/${uid}`,
            ...("metadata" in fields ? fields.metadata : {}),
          },
        };
      };
      const a = data("a", 1);
      const b = data("b", 2);
      store.items.replace(
        store["sortItems"]([new ObjectType(a as never), new ObjectType(b as never)] as never) as never,
      );
      expect(store.items.map((item) => item.getId())).toEqual(["b", "a"]);
      const sort = vi.fn(store["sortItems"]);
      store["sortItems"] = sort;
      store["eventsBuffer"].push({ type: "MODIFIED", object: data("a", 1, "2") } as never);
      store["updateFromEventsBuffer"]();
      expect(sort).not.toHaveBeenCalled();
      store["eventsBuffer"].push({ type: "MODIFIED", object: data("a", 3, "3") } as never);
      store["updateFromEventsBuffer"]();
      expect(sort).toHaveBeenCalledTimes(1);
      expect(store.items.map((item) => item.getId())).toEqual(["a", "b"]);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

// `sortKeyChanged` compares the values `sorting` declares, which is what
// `sortItems` sorts by unless a store overrides one of them. A core store that
// overrode `sortItems` would lose the watch optimisation, and one that overrode
// `sortKeyChanged` could stop re-sorting on watch updates without any test
// noticing.
describe("core stores", () => {
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const isTest = (file: string) => /(^|\/)__tests__\/|\.test\.tsx?$/.test(file);
  const sources = readdirSync(sourceRoot, { recursive: true, encoding: "utf8" })
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => /\.tsx?$/.test(file) && !isTest(file) && file !== "common/item.store.ts");

  it.each(["sortItems", "sortKeyChanged"])("do not override %s", (method) => {
    const definition = new RegExp(`^\\s*(?:(?:public|protected|private|override|async)\\s+)*${method}\\s*[<(]`, "m");

    expect(sources.filter((file) => definition.test(readFileSync(path.join(sourceRoot, file), "utf8")))).toEqual([]);
  });
});
