/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeApi } from "@freelensapp/kube-api";
import { KubeObject } from "@freelensapp/kube-object";

import type { KubeApiDependencies, KubeApiListOptions, KubeApiQueryParams, KubeJsonApi } from "@freelensapp/kube-api";
import type { NamespaceScopedMetadata } from "@freelensapp/kube-object";

// The labels Helm puts on every object of its storage drivers.
export const helmReleaseLabelSelector = "owner=helm";

// The API server answers with the first media type it supports and does not
// fall back to the next one, so a list and a watch each need their own: a list
// asked for `PartialObjectMetadata` fails with 406, and a watch asked for
// `PartialObjectMetadataList` returns an empty stream.
export const metadataListAccept = "application/json;as=PartialObjectMetadataList;g=meta.k8s.io;v=v1";
export const metadataWatchAccept = "application/json;as=PartialObjectMetadata;g=meta.k8s.io;v=v1";

/**
 * The metadata of a Secret or a ConfigMap of Helm's storage, without its data.
 */
export class HelmReleaseObject extends KubeObject<NamespaceScopedMetadata, void, void> {}

export interface HelmReleaseObjectApiOptions {
  kind: "Secret" | "ConfigMap";
  apiBase: string;

  /**
   * Sends `metadataWatchAccept` with every request: `KubeApi.watch` passes no
   * headers of its own, and the list sets its header itself.
   */
  request: KubeJsonApi;
}

/**
 * Lists and watches only the metadata of the objects Helm stores its releases in.
 */
export class HelmReleaseObjectApi extends KubeApi<HelmReleaseObject> {
  constructor(dependencies: KubeApiDependencies, options: HelmReleaseObjectApiOptions) {
    super(dependencies, { ...options, objectConstructor: HelmReleaseObject, isNamespaced: true });
  }

  list({ reqInit, ...options }: KubeApiListOptions = {}, query?: KubeApiQueryParams) {
    return super.list(
      { ...options, reqInit: { ...reqInit, headers: { ...reqInit?.headers, accept: metadataListAccept } } },
      { ...query, labelSelector: helmReleaseLabelSelector },
    );
  }

  // The API server sends `items: null` for an empty list of metadata, which
  // `KubeApi` does not take for a list: it would keep no resourceVersion, and
  // the store would not watch a namespace that has no release yet.
  protected parseResponse(data: unknown, namespace?: string) {
    if (typeof data === "object" && data !== null && "items" in data && data.items === null) {
      return super.parseResponse({ ...data, items: [] }, namespace);
    }

    return super.parseResponse(data, namespace);
  }

  getWatchUrl(namespace?: string, query?: KubeApiQueryParams) {
    return super.getWatchUrl(namespace, { ...query, labelSelector: helmReleaseLabelSelector });
  }
}
