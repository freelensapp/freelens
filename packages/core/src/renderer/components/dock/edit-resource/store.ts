/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DockTabStore } from "../dock-tab-store/dock-tab.store";

import type { KubeObject } from "@freelensapp/kube-object";

import type { DockTabStoreDependencies } from "../dock-tab-store/dock-tab.store";

export interface EditingResource {
  resource: string; // resource path, e.g. /api/v1/namespaces/default
  draft?: string; // edited draft in yaml
  firstDraft?: string;
}

export class EditResourceTabStore extends DockTabStore<EditingResource> {
  constructor(protected readonly dependencies: DockTabStoreDependencies) {
    super(dependencies, {
      storageKey: "edit_resource_store",
    });
  }

  /**
   * A tab fetches its resource again whenever it opens, so the YAML of the
   * cluster is not kept, and a draft only while it has changes not saved yet.
   */
  protected finalizeDataForSave({ draft, firstDraft, ...data }: EditingResource): EditingResource {
    return draft !== undefined && draft !== firstDraft ? { ...data, draft } : data;
  }

  getTabIdByResource(object: KubeObject): string | undefined {
    return this.findTabIdFromData(({ resource }) => object.selfLink === resource);
  }
}
