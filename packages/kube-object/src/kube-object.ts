/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatDuration, isObject, isString } from "@freelensapp/utilities";
import autoBind from "auto-bind";
import { omit } from "lodash";
import moment from "moment";
import { KubeCreationError } from "./api-types";
import {
  filterOutResourceApplierAnnotations,
  isJsonApiData,
  isJsonApiDataList,
  isKubeJsonApiListMetadata,
  isKubeJsonApiMetadata,
  isKubeObjectNonSystem,
  isPartialJsonApiData,
  isPartialJsonApiMetadata,
  stringifyLabels,
} from "./utils";

import type { KubeJsonApiData, KubeObjectMetadata, KubeObjectScope } from "./api-types";

export function createKubeObject<
  Metadata extends KubeObjectMetadata = KubeObjectMetadata,
  Status = unknown,
  Spec = unknown,
>(data: KubeJsonApiData<Metadata, Status, Spec>) {
  return new KubeObject(data);
}

export class KubeObject<
  Metadata extends KubeObjectMetadata<KubeObjectScope> = KubeObjectMetadata<KubeObjectScope>,
  Status = unknown,
  Spec = unknown,
> {
  static readonly kind?: string;

  static readonly namespaced?: boolean;

  static readonly apiBase?: string;

  apiVersion!: string;

  kind!: string;

  metadata!: Metadata;

  status?: Status;

  spec!: Spec;

  /**
   * @deprecated Switch to using {@link createKubeObject} instead
   */
  static create = createKubeObject;

  /**
   * @deprecated Switch to using {@link isKubeObjectNonSystem} instead
   */
  static isNonSystem = isKubeObjectNonSystem;

  /**
   * @deprecated Switch to using {@link isJsonApiData} instead
   */
  static isJsonApiData = isJsonApiData;

  /**
   * @deprecated Switch to using {@link isKubeJsonApiListMetadata} instead
   */
  static isKubeJsonApiListMetadata = isKubeJsonApiListMetadata;

  /**
   * @deprecated Switch to using {@link isKubeJsonApiMetadata} instead
   */
  static isKubeJsonApiMetadata = isKubeJsonApiMetadata;

  /**
   * @deprecated Switch to using {@link isPartialJsonApiMetadata} instead
   */
  static isPartialJsonApiMetadata = isPartialJsonApiMetadata;

  /**
   * @deprecated Switch to using {@link isPartialJsonApiData} instead
   */
  static isPartialJsonApiData = isPartialJsonApiData;

  /**
   * @deprecated Switch to using {@link isJsonApiDataList} instead
   */
  static isJsonApiDataList = isJsonApiDataList;

  /**
   * @deprecated Switch to using {@link stringifyLabels} instead
   */
  static stringifyLabels = stringifyLabels;

  constructor(data: KubeJsonApiData<Metadata, Status, Spec>) {
    if (!isObject(data)) {
      throw new TypeError(`Cannot create a KubeObject from ${typeof data}`);
    }

    if (!isObject(data.metadata)) {
      throw new KubeCreationError(`Cannot create a KubeObject from an object without metadata`, data);
    }

    if (!isString(data.metadata.name)) {
      throw new KubeCreationError(
        `Cannot create a KubeObject from an object without metadata.name being a string`,
        data,
      );
    }

    if (!isString(data.metadata.selfLink)) {
      throw new KubeCreationError(
        `Cannot create a KubeObject from an object without metadata.selfLink being a string`,
        data,
      );
    }

    Object.assign(this, data);
    autoBind(this);
  }

  get selfLink(): string {
    return this.metadata.selfLink;
  }

  getId(): string {
    return this.metadata.uid ?? this.metadata.selfLink;
  }

  getResourceVersion(): string {
    return this.metadata.resourceVersion ?? "";
  }

  getScopedName() {
    return [this.getNs(), this.getName()].filter(Boolean).join("/");
  }

  getName(): string {
    return this.metadata.name;
  }

  getNs(): Metadata["namespace"] {
    // avoid "null" serialization via JSON.stringify when post data
    return this.metadata.namespace || undefined;
  }

  /**
   * This function computes the number of milliseconds from the UNIX EPOCH to the
   * creation timestamp of this object.
   */
  getCreationTimestamp() {
    if (!this.metadata.creationTimestamp) {
      return Date.now();
    }

    return new Date(this.metadata.creationTimestamp).getTime();
  }

  /**
   * @deprecated This function computes a new "now". Switch to using {@link KubeObject.getCreationTimestamp} instead
   */
  getTimeDiffFromNow(): number {
    if (!this.metadata.creationTimestamp) {
      return 0;
    }

    return Date.now() - new Date(this.metadata.creationTimestamp).getTime();
  }

  /**
   * @deprecated This function computes a new "now" on every call might cause subtle issues if called multiple times
   *
   * NOTE: this function also is not reactive to updates in the current time so it should not be used for rendering
   */
  getAge(humanize = true, compact = true, fromNow = false): string | number {
    if (fromNow) {
      return moment(this.metadata.creationTimestamp).fromNow(); // "string", getTimeDiffFromNow() cannot be used
    }
    const diff = this.getTimeDiffFromNow();

    if (humanize) {
      return formatDuration(diff, compact);
    }

    return diff;
  }

  getFinalizers(): string[] {
    return this.metadata.finalizers || [];
  }

  getLabels(): string[] {
    return KubeObject.stringifyLabels(this.metadata.labels);
  }

  getAnnotations(filter = false): string[] {
    const labels = KubeObject.stringifyLabels(this.metadata.annotations);

    if (!filter) {
      return labels;
    }

    return labels.filter(filterOutResourceApplierAnnotations);
  }

  getOwnerRefs() {
    const refs = this.metadata.ownerReferences || [];
    const namespace = this.getNs();

    return refs.map((ownerRef) => ({ ...ownerRef, namespace }));
  }

  getSearchFields() {
    return [this.getName(), this.getNs(), this.getId(), ...this.getLabels(), ...this.getAnnotations(true)];
  }

  toPlainObject(omitFields: string[] = ["metadata.managedFields"]) {
    return omit(JSON.parse(JSON.stringify(this)), omitFields) as Record<string, unknown>;
  }
}
