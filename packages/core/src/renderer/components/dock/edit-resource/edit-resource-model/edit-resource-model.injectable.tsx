/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createKubeApiURL, parseKubeApi } from "@freelensapp/kube-api";
import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { waitUntilDefined } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import assert from "assert";
import yaml from "js-yaml";
import { action, computed, observable, runInAction } from "mobx";
import React from "react";
import { createPatch } from "rfc6902";
import { defaultYamlDumpOptions } from "../../../../../common/kube-helpers";
import editResourceTabStoreInjectable from "../store.injectable";
import requestKubeResourceInjectable from "./request-kube-resource.injectable";
import requestPatchKubeResourceInjectable from "./request-patch-kube-resource.injectable";

import type { KubeObject, RawKubeObject } from "@freelensapp/kube-object";
import type { ShowNotification } from "@freelensapp/notifications";

import type { EditingResource, EditResourceTabStore } from "../store";
import type { RequestKubeResource } from "./request-kube-resource.injectable";
import type { RequestPatchKubeResource } from "./request-patch-kube-resource.injectable";

const editResourceModelInjectable = getInjectable({
  id: "edit-resource-model",

  instantiate: async (di, tabId: string) => {
    const store = di.inject(editResourceTabStoreInjectable);

    const model = new EditResourceModel({
      requestKubeResource: di.inject(requestKubeResourceInjectable),
      requestPatchKubeResource: di.inject(requestPatchKubeResourceInjectable),
      showSuccessNotification: di.inject(showSuccessNotificationInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
      store,
      tabId,
      waitForEditingResource: () => waitUntilDefined(() => store.getData(tabId)),
    });

    await model.load();

    return model;
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, tabId: string) => tabId,
  }),
});

export default editResourceModelInjectable;

interface Dependencies {
  requestKubeResource: RequestKubeResource;
  requestPatchKubeResource: RequestPatchKubeResource;
  waitForEditingResource: () => Promise<EditingResource>;
  showSuccessNotification: ShowNotification;
  showErrorNotification: ShowNotification;
  readonly store: EditResourceTabStore;
  readonly tabId: string;
}

function getEditSelfLinkFor(object: RawKubeObject): string | undefined {
  const lensVersionAnnotation = object.metadata.annotations?.[EditResourceAnnotationName];

  if (lensVersionAnnotation) {
    const parsedKubeApi = parseKubeApi(object.metadata.selfLink);

    if (!parsedKubeApi) {
      return undefined;
    }

    const { apiVersionWithGroup, ...parsedApi } = parsedKubeApi;

    return createKubeApiURL({
      ...parsedApi,
      apiVersion: lensVersionAnnotation,
    });
  }

  return object.metadata.selfLink;
}

/**
 * The annotation name that Lens uses to receive the desired api version
 */
export const EditResourceAnnotationName = "freelens.app/resource-version";

export class EditResourceModel {
  constructor(protected readonly dependencies: Dependencies) {}

  // Store the managed fields when they're removed so we can restore them
  @observable private savedManagedFields: any = null;

  readonly managedFields = {
    value: observable.box(false),

    onChange: action((value: boolean) => {
      this.managedFields.value.set(value);
      this.toggleManagedFields(value);
    }),
  };

  readonly configuration = {
    value: computed(() => this.editingResource.draft || this.editingResource.firstDraft || ""),

    onChange: action((value: string) => {
      this.editingResource.draft = value;
      this.configuration.error.value.set("");
    }),

    error: {
      value: observable.box(""),

      onChange: action((error: string) => {
        this.configuration.error.value.set(error);
      }),
    },
  };

  @observable private _resource: KubeObject | undefined;

  @computed get shouldShowErrorAboutNoResource() {
    return !this._resource;
  }

  @computed get resource() {
    assert(this._resource, "Resource does not have data");

    return this._resource;
  }

  @computed get editingResource() {
    const resource = this.dependencies.store.getData(this.dependencies.tabId);

    assert(resource, "Resource is not present in the store");

    return resource;
  }

  @computed private get selfLink() {
    return this.editingResource.resource;
  }

  toggleManagedFields = (showManagedFields: boolean) => {
    const currentValue = this.configuration.value.get();

    if (!currentValue) {
      return;
    }

    try {
      const parsedYaml = yaml.load(currentValue) as RawKubeObject;

      if (showManagedFields) {
        // Restore managed fields if we have them saved
        if (this.savedManagedFields && parsedYaml.metadata) {
          parsedYaml.metadata.managedFields = this.savedManagedFields;
        }
      } else {
        // Save and remove managed fields
        if (parsedYaml.metadata?.managedFields) {
          this.savedManagedFields = parsedYaml.metadata.managedFields;
          delete parsedYaml.metadata.managedFields;
        }
      }

      const newYaml = yaml.dump(parsedYaml, defaultYamlDumpOptions);

      runInAction(() => {
        this.editingResource.draft = newYaml;
      });
    } catch (error) {
      // If parsing fails, show error but don't update the content
      console.warn("Failed to parse YAML for managed fields toggle:", error);
    }
  };

  regenerateYaml = () => {
    if (!this._resource) {
      return;
    }

    const omitFields = this.managedFields.value.get() ? [] : ["metadata.managedFields"];

    runInAction(() => {
      const newYaml = yaml.dump(this._resource!.toPlainObject(omitFields), defaultYamlDumpOptions);
      this.editingResource.firstDraft = newYaml;
      this.editingResource.draft = newYaml;

      // Store managed fields if they exist for future restoration
      if (!this.managedFields.value.get() && this._resource!.metadata?.managedFields) {
        this.savedManagedFields = this._resource!.metadata.managedFields;
      }
    });
  };
  load = async (): Promise<void> => {
    await this.dependencies.waitForEditingResource();

    let result = await this.dependencies.requestKubeResource(this.selfLink);

    if (!result.callWasSuccessful) {
      return void this.dependencies.showErrorNotification(`Loading resource failed: ${result.error}`);
    }

    if (result?.response?.metadata.annotations?.[EditResourceAnnotationName]) {
      const parsed = parseKubeApi(this.selfLink);

      if (!parsed) {
        return void this.dependencies.showErrorNotification(`Object's selfLink is invalid: "${this.selfLink}"`);
      }

      parsed.apiVersion = result.response.metadata.annotations[EditResourceAnnotationName];

      result = await this.dependencies.requestKubeResource(createKubeApiURL(parsed));
    }

    if (!result.callWasSuccessful) {
      return void this.dependencies.showErrorNotification(`Loading resource failed: ${result.error}`);
    }

    const resource = result.response;

    runInAction(() => {
      this._resource = resource;
    });

    if (!resource) {
      return;
    }

    this.regenerateYaml();
  };

  get namespace() {
    return this.resource.metadata.namespace || "default";
  }

  get name() {
    return this.resource.metadata.name;
  }

  get kind() {
    return this.resource.kind;
  }

  save = async () => {
    const currentValue = this.configuration.value.get();
    const currentVersion = yaml.load(currentValue) as RawKubeObject;
    const firstVersion = yaml.load(this.editingResource.firstDraft ?? currentValue);

    // Make sure we save this annotation so that we can use it in the future
    currentVersion.metadata.annotations ??= {};
    currentVersion.metadata.annotations[EditResourceAnnotationName] = currentVersion.apiVersion.split("/").pop();

    const patches = createPatch(firstVersion, currentVersion);
    const selfLink = getEditSelfLinkFor(currentVersion);

    if (!selfLink) {
      this.dependencies.showErrorNotification(
        <p>{`Cannot save resource, unknown selfLink: "${currentVersion.metadata.selfLink}"`}</p>,
      );

      return null;
    }

    const result = await this.dependencies.requestPatchKubeResource(selfLink, patches);

    if (!result.callWasSuccessful) {
      this.dependencies.showErrorNotification(<p>Failed to save resource: {result.error}</p>);

      return null;
    }

    const { kind, name } = result.response;

    this.dependencies.showSuccessNotification(
      <p>
        {kind} <b>{name}</b>
        {" updated."}
      </p>,
    );

    runInAction(() => {
      this.editingResource.firstDraft = yaml.dump(currentVersion, defaultYamlDumpOptions);
      this.editingResource.resource = selfLink;
    });

    // NOTE: This is required for `saveAndClose` to work correctly
    return [];
  };
}
