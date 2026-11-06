/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { createKubeApiURL, parseKubeApi } from "@freelensapp/kube-api";
import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { waitUntilDefined } from "@freelensapp/utilities";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import * as yaml from "js-yaml";
import { action, computed, observable, runInAction } from "mobx";
import { createPatch, type Operation } from "rfc6902";
import { defaultYamlDumpOptions } from "../../../../../common/kube-helpers";
import { countChangedLines } from "../changed-lines";
import editResourceTabStoreInjectable from "../store.injectable";
import requestKubeResourceInjectable from "./request-kube-resource.injectable";
import requestPatchKubeResourceInjectable from "./request-patch-kube-resource.injectable";

import type { Container, KubeObject, KubeObjectMetadata, PodSpec, RawKubeObject } from "@freelensapp/kube-object";
import type { ShowNotification } from "@freelensapp/notifications";

import type { EditingResource, EditResourceTabStore } from "../store";
import type { RequestKubeResource } from "./request-kube-resource.injectable";
import type { PatchKubeResourceOptions, RequestPatchKubeResource } from "./request-patch-kube-resource.injectable";

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

type PodEditResource = RawKubeObject<KubeObjectMetadata, Record<string, unknown>, PodSpec>;

interface PodResizePatchContainer {
  name: string;
  resources?: Container["resources"];
}

type PodResizePatchPayload = Record<string, unknown> & {
  spec: {
    resources?: PodSpec["resources"];
    containers?: PodResizePatchContainer[];
    initContainers?: PodResizePatchContainer[];
  };
};

type PatchRequest =
  | {
      patch: ReturnType<typeof createPatch>;
      options: PatchKubeResourceOptions;
    }
  | {
      patch: PodResizePatchPayload;
      options: PatchKubeResourceOptions;
    }
  | {
      error: string;
    };

function isPodResourcePath(path: string) {
  return /^\/spec\/(?:resources(?:\/.*)?|(?:containers|initContainers)\/\d+\/resources(?:\/.*)?)$/.test(path);
}

function isPod(object: RawKubeObject) {
  return object.kind === "Pod";
}

function getPodResizePatchContainer(container: Container): PodResizePatchContainer {
  return {
    name: container.name,
    resources: container.resources,
  };
}

function getPodResizePatchPayload(object: PodEditResource): PodResizePatchPayload {
  return {
    spec: {
      resources: object.spec?.resources,
      containers: object.spec?.containers?.map(getPodResizePatchContainer),
      initContainers: object.spec?.initContainers?.map(getPodResizePatchContainer),
    },
  };
}

function getPatchRequestFor(currentVersion: RawKubeObject, firstVersion: RawKubeObject): PatchRequest {
  const patch = createPatch(firstVersion, currentVersion);

  if (!isPod(currentVersion)) {
    return {
      patch,
      options: {
        strategy: "json",
      },
    };
  }

  const currentPodVersion = currentVersion as PodEditResource;

  const hasResourceChanges = patch.some((operation: Operation) => isPodResourcePath(operation.path));

  if (!hasResourceChanges) {
    return {
      patch,
      options: {
        strategy: "json",
      },
    };
  }

  const hasNonResourceChanges = patch.some((operation: Operation) => !isPodResourcePath(operation.path));

  if (hasNonResourceChanges) {
    return {
      error:
        "Pod resource updates must be saved separately from other pod changes because Kubernetes uses the resize subresource for requests and limits.",
    };
  }

  return {
    patch: getPodResizePatchPayload(currentPodVersion),
    options: {
      strategy: "strategic",
      subResource: "resize",
    },
  };
}

function setEditResourceVersionAnnotation(object: RawKubeObject) {
  object.metadata.annotations ??= {};
  object.metadata.annotations[EditResourceAnnotationName] = object.apiVersion.split("/").pop();
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

  readonly diffVisible = observable.box(false);
  readonly sideBySide = observable.box(true);
  readonly comparingServer = observable.box(false);
  readonly serverYaml = observable.box<string | undefined>(undefined);
  readonly reloading = observable.box(false);
  readonly reloadError = observable.box("");

  @computed get baseline() {
    return this.editingResource.baseline ?? this.editingResource.firstDraft ?? "";
  }

  @computed get comparisonYaml() {
    return this.comparingServer.get() ? (this.serverYaml.get() ?? this.baseline) : this.baseline;
  }

  @computed get changedLines() {
    return countChangedLines(this.comparisonYaml, this.configuration.value.get());
  }

  @computed get hasChanges() {
    return this.configuration.value.get() !== this.baseline;
  }

  @computed get hasServerChanges() {
    return this.serverYaml.get() !== undefined && this.serverYaml.get() !== this.baseline;
  }

  toggleDiff = action(() => this.diffVisible.set(!this.diffVisible.get()));

  compareServer = action(() => {
    this.comparingServer.set(true);
    this.diffVisible.set(true);
  });

  acceptServerBaseline = action(() => {
    const serverYaml = this.serverYaml.get();

    if (serverYaml === undefined) return;
    this.editingResource.baseline = serverYaml;
    this.comparingServer.set(false);
    this.serverYaml.set(undefined);
  });

  revert = action(() => {
    this.configuration.onChange(this.baseline);
    this.comparingServer.set(false);
  });

  reloadBaseline = async () => {
    if (this.reloading.get()) return;
    runInAction(() => {
      this.reloading.set(true);
      this.reloadError.set("");
    });
    try {
      await this.load(true);
    } catch {
      runInAction(() => this.reloadError.set("Could not reload the resource. Try again."));
    } finally {
      runInAction(() => this.reloading.set(false));
    }
  };

  // Store the managed fields when they're removed so we can restore them
  @observable private accessor savedManagedFields: any = null;

  // Store the unsorted YAML when sort is enabled so we can restore it
  @observable private accessor savedUnsortedYaml: string | null = null;

  readonly managedFields = {
    value: observable.box(false),

    onChange: action((value: boolean) => {
      this.managedFields.value.set(value);
      this.toggleManagedFields(value);
    }),
  };

  readonly sortKeys = {
    value: observable.box(false),

    onChange: action((value: boolean) => {
      this.sortKeys.value.set(value);
      this.toggleSortKeys(value);
    }),
  };

  readonly configuration = {
    value: computed(() => this.editingResource.draft ?? this.editingResource.firstDraft ?? ""),

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

  @observable private accessor _resource: KubeObject | undefined;

  @computed get shouldShowErrorAboutNoResource() {
    // Also treat a missing store entry as "no resource": when the dock tab is
    // closed (cancel / save-and-close), its data is removed from the store
    // while this observer view can still re-render once before unmounting. The
    // `editingResource` getter asserts on the store entry, so without this guard
    // that transient render throws and trips the dock's ErrorBoundary.
    return !this._resource || !this.dependencies.store.getData(this.dependencies.tabId);
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

      const newYaml = yaml.dump(parsedYaml, {
        ...defaultYamlDumpOptions,
        sortKeys: this.sortKeys.value.get(),
      });

      runInAction(() => {
        this.editingResource.draft = newYaml;
      });
    } catch (error) {
      // If parsing fails, show error but don't update the content
      console.warn("Failed to parse YAML for managed fields toggle:", error);
    }
  };

  toggleSortKeys = (sortKeys: boolean) => {
    const currentValue = this.configuration.value.get();

    try {
      if (sortKeys) {
        this.savedUnsortedYaml = currentValue;
      } else if (
        this.savedUnsortedYaml !== null &&
        currentValue ===
          yaml.dump(yaml.load(this.savedUnsortedYaml), {
            ...defaultYamlDumpOptions,
            sortKeys: true,
          })
      ) {
        this.configuration.onChange(this.savedUnsortedYaml);
        this.savedUnsortedYaml = null;
        return;
      }

      this.configuration.onChange(
        yaml.dump(yaml.load(currentValue), {
          ...defaultYamlDumpOptions,
          sortKeys,
        }),
      );
    } catch {
      // Keep invalid or incomplete YAML intact while the user is editing.
    }
  };

  regenerateYaml = (sortKeys?: boolean) => {
    if (!this._resource) {
      return;
    }

    const omitFields = this.managedFields.value.get() ? [] : ["metadata.managedFields"];
    const shouldSortKeys = sortKeys ?? this.sortKeys.value.get();

    runInAction(() => {
      const newYaml = yaml.dump(this._resource!.toPlainObject(omitFields), {
        ...defaultYamlDumpOptions,
        sortKeys: shouldSortKeys,
      });

      // Store unsorted version when enabling sort for the first time
      if (shouldSortKeys && !this.savedUnsortedYaml && !sortKeys) {
        this.savedUnsortedYaml = this.editingResource.draft ?? this.editingResource.firstDraft ?? "";
      }

      this.editingResource.firstDraft = newYaml;
      this.editingResource.baseline ??= newYaml;

      // Only set draft if there isn't already a saved draft from previous session
      // OR if we're explicitly regenerating (sortKeys parameter was provided)
      if (this.editingResource.draft === undefined || sortKeys !== undefined) {
        this.editingResource.draft = newYaml;
      }

      // Store managed fields if they exist for future restoration
      if (!this.managedFields.value.get() && this._resource!.metadata?.managedFields) {
        this.savedManagedFields = this._resource!.metadata.managedFields;
      }
    });
  };
  load = async (reloadBaseline = false): Promise<void> => {
    await this.dependencies.waitForEditingResource();

    let result = await this.dependencies.requestKubeResource(this.selfLink);

    if (!result.callWasSuccessful) {
      const message = `Loading resource failed: ${result.error}`;

      if (reloadBaseline) runInAction(() => this.reloadError.set(message));
      return void this.dependencies.showErrorNotification(message);
    }

    if (result.response?.metadata.annotations?.[EditResourceAnnotationName]) {
      const parsed = parseKubeApi(this.selfLink);

      if (!parsed) {
        const message = `Object's selfLink is invalid: "${this.selfLink}"`;

        if (reloadBaseline) runInAction(() => this.reloadError.set(message));
        return void this.dependencies.showErrorNotification(message);
      }

      parsed.apiVersion = result.response.metadata.annotations[EditResourceAnnotationName];

      result = await this.dependencies.requestKubeResource(createKubeApiURL(parsed));
    }

    if (!result.callWasSuccessful) {
      const message = `Loading resource failed: ${result.error}`;

      if (reloadBaseline) runInAction(() => this.reloadError.set(message));
      return void this.dependencies.showErrorNotification(message);
    }

    const resource = result.response;

    if (reloadBaseline) {
      runInAction(() => {
        if (!resource) {
          this.reloadError.set("Resource not found. Your draft has been kept.");
          return;
        }

        // Do not rebase Save or discard local edits when inspecting a newer server version.
        this.serverYaml.set(yaml.dump(resource.toPlainObject(["metadata.managedFields"]), defaultYamlDumpOptions));
        if (!this.hasServerChanges) this.comparingServer.set(false);
      });
      return;
    }

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
    const firstVersion = yaml.load(this.editingResource.firstDraft ?? currentValue) as RawKubeObject;
    let patchRequest = getPatchRequestFor(currentVersion, firstVersion);

    if ("error" in patchRequest) {
      this.dependencies.showErrorNotification(<p>Failed to save resource: {patchRequest.error}</p>);

      return null;
    }

    if (patchRequest.options.subResource !== "resize") {
      setEditResourceVersionAnnotation(currentVersion);
      patchRequest = getPatchRequestFor(currentVersion, firstVersion);
    }

    if ("error" in patchRequest) {
      this.dependencies.showErrorNotification(<p>Failed to save resource: {patchRequest.error}</p>);

      return null;
    }

    const selfLink = getEditSelfLinkFor(currentVersion);

    if (!selfLink) {
      this.dependencies.showErrorNotification(
        <p>{`Cannot save resource, unknown selfLink: "${currentVersion.metadata.selfLink}"`}</p>,
      );

      return null;
    }

    const result = await this.dependencies.requestPatchKubeResource(selfLink, patchRequest.patch, patchRequest.options);

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
