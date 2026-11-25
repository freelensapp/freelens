/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { exportCluster, exportContext, exportUser } from "@kubernetes/client-node/dist/config_types.js";

import type { Cluster, Context, User } from "@kubernetes/client-node";

export interface KubeConfigOptions {
  clusters: Cluster[];
  users: User[];
  contexts: Context[];
  currentContext: string;
}

// As `findObject` of @kubernetes/client-node looks an entry up.
function findObject<T extends { name: string }>(list: T[] | undefined, name: string, key: string): T | null {
  for (const obj of list ?? []) {
    if (obj.name === name) {
      const nested = (obj as Record<string, unknown>)[key];

      if (nested && typeof nested === "object") {
        (nested as { name: string }).name = name;

        return nested as T;
      }

      return obj;
    }
  }

  return null;
}

function addUnique<T extends { name: string }>(list: T[], entry: T, kind: string): void {
  if (list.some((existing) => existing.name === entry.name)) {
    throw new Error(`Duplicate ${kind}: ${entry.name}`);
  }

  list.push(entry);
}

/**
 * The content of a kubeconfig, with the accessors of the `KubeConfig` of
 * @kubernetes/client-node that work on it alone, behaving the same. Importing
 * that `KubeConfig` brings its HTTP client and every authentication provider
 * along, which the renderer, which only reads and edits kubeconfigs, must not
 * bundle. Main builds a client `KubeConfig` from it where it makes requests.
 */
export class KubeConfigData {
  clusters: Cluster[];
  users: User[];
  contexts: Context[];
  currentContext: string;

  constructor({ clusters, users, contexts, currentContext }: Partial<KubeConfigOptions> = {}) {
    this.clusters = clusters ?? [];
    this.users = users ?? [];
    this.contexts = contexts ?? [];
    this.currentContext = currentContext ?? "";
  }

  getContexts(): Context[] {
    return this.contexts;
  }

  getClusters(): Cluster[] {
    return this.clusters;
  }

  getUsers(): User[] {
    return this.users;
  }

  getCurrentContext(): string {
    return this.currentContext;
  }

  setCurrentContext(context: string): void {
    this.currentContext = context;
  }

  getContextObject(name: string): Context | null {
    return findObject(this.contexts, name, "context");
  }

  getCluster(name: string): Cluster | null {
    return findObject(this.clusters, name, "cluster");
  }

  getUser(name: string): User | null {
    return findObject(this.users, name, "user");
  }

  addCluster(cluster: Cluster): void {
    addUnique(this.clusters, cluster, "cluster");
  }

  addUser(user: User): void {
    addUnique(this.users, user, "user");
  }

  addContext(context: Context): void {
    addUnique(this.contexts, context, "context");
  }

  /**
   * The kubeconfig as JSON, as `exportConfig()` of `KubeConfig` writes it.
   */
  exportConfig(): string {
    return JSON.stringify({
      apiVersion: "v1",
      kind: "Config",
      clusters: this.clusters.map(exportCluster),
      users: this.users.map(exportUser),
      contexts: this.contexts.map(exportContext),
      preferences: {},
      "current-context": this.getCurrentContext(),
    });
  }
}
