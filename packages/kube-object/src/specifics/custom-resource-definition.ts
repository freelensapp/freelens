/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL } from "@freelensapp/utilities";
import { KubeObject } from "../kube-object";

import type { BaseKubeObjectCondition, ClusterScopedMetadata } from "../api-types";
import type { JSONSchemaProps } from "../types/json-schema-props";
import type { WebhookClientConfig } from "./mutating-webhook-configuration";

export interface AdditionalPrinterColumnsCommon {
  name: string;
  type: "integer" | "number" | "string" | "boolean" | "date";
  priority?: number;
  format?: "int32" | "int64" | "float" | "double" | "byte" | "binary" | "date" | "date-time" | "password";
  description?: string;
}

export type AdditionalPrinterColumnsV1 = AdditionalPrinterColumnsCommon & {
  jsonPath: string;
};

type AdditionalPrinterColumnsV1Beta = AdditionalPrinterColumnsCommon & {
  JSONPath: string;
};

export interface CustomResourceValidation {
  openAPIV3Schema?: JSONSchemaProps;
}

export interface CustomResourceDefinitionVersion {
  name: string;
  served: boolean;
  storage: boolean;
  schema?: CustomResourceValidation; // required in v1 but not present in v1beta
  additionalPrinterColumns?: AdditionalPrinterColumnsV1[];
}

export interface CustomResourceDefinitionNames {
  categories?: string[];
  kind: string;
  listKind?: string;
  plural: string;
  shortNames?: string[];
  singular?: string;
}

export interface CustomResourceConversion {
  strategy?: string;
  webhook?: WebhookConversion;
}

export interface WebhookConversion {
  clientConfig?: WebhookClientConfig[];
  conversionReviewVersions: string[];
}

export interface CustomResourceDefinitionSpec {
  group: string;
  /**
   * @deprecated for apiextensions.k8s.io/v1 but used in v1beta1
   */
  version?: string;
  names: CustomResourceDefinitionNames;
  scope: "Namespaced" | "Cluster";
  /**
   * @deprecated for apiextensions.k8s.io/v1 but used in v1beta1
   */
  validation?: object;
  versions?: CustomResourceDefinitionVersion[];
  conversion?: CustomResourceConversion;
  /**
   * @deprecated for apiextensions.k8s.io/v1 but used in v1beta1
   */
  additionalPrinterColumns?: AdditionalPrinterColumnsV1Beta[];
  preserveUnknownFields?: boolean;
}

export interface CustomResourceDefinitionConditionAcceptedNames {
  plural: string;
  singular: string;
  kind: string;
  shortNames: string[];
  listKind: string;
}

export interface CustomResourceDefinitionStatus {
  conditions?: BaseKubeObjectCondition[];
  acceptedNames: CustomResourceDefinitionConditionAcceptedNames;
  storedVersions: string[];
}

const kubeVersionPattern = /^v(\d+)(?:(alpha|beta)(\d+))?$/;
const kubeVersionStability = { alpha: 0, beta: 1, ga: 2 } as const;

const parseKubeVersion = (name: string) => {
  const match = kubeVersionPattern.exec(name);

  if (!match) {
    return undefined;
  }

  const [, major, stability, minor] = match;

  return {
    stability: kubeVersionStability[(stability as "alpha" | "beta" | undefined) ?? "ga"],
    major: Number(major),
    minor: minor === undefined ? 0 : Number(minor),
  };
};

/**
 * Orders version names by Kubernetes version priority, highest first, as
 * Kubernetes orders the versions of a CRD: names of the form `v1`, `v1beta2` or
 * `v1alpha3` come first, GA before beta before alpha, then by major and by minor
 * version, both descending. Any other name comes after them, alphabetically.
 */
const compareByKubeVersionPriority = (left: string, right: string) => {
  const leftVersion = parseKubeVersion(left);
  const rightVersion = parseKubeVersion(right);

  if (leftVersion && rightVersion) {
    return (
      rightVersion.stability - leftVersion.stability ||
      rightVersion.major - leftVersion.major ||
      rightVersion.minor - leftVersion.minor
    );
  }

  if (leftVersion) {
    return -1;
  }

  if (rightVersion) {
    return 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
};

export class CustomResourceDefinition extends KubeObject<
  ClusterScopedMetadata,
  CustomResourceDefinitionStatus,
  CustomResourceDefinitionSpec
> {
  static kind = "CustomResourceDefinition";

  static namespaced = false;

  static apiBase = "/apis/apiextensions.k8s.io/v1/customresourcedefinitions";

  getResourceUrl() {
    // TODO: replace this magic string with a use of `customResourcesRouteInjectable` when that is extracted
    return buildURL("/crd/:group?/:name?", {
      params: {
        group: this.getGroup(),
        name: this.getPluralName(),
      },
    });
  }

  /**
   * @param version The version to read the resources through, the preferred
   * version by default.
   */
  getResourceApiBase(version = this.getVersion()) {
    const { group } = this.spec;

    return `/apis/${group}/${version}/${this.getPluralName()}`;
  }

  getPluralName() {
    return this.getNames().plural;
  }

  getResourceKind() {
    return this.spec.names.kind;
  }

  getResourceTitle() {
    const name = this.getPluralName();

    return name[0].toUpperCase() + name.slice(1);
  }

  getGroup() {
    return this.spec.group;
  }

  getScope() {
    return this.spec.scope;
  }

  /**
   * The version the host reads the custom resources through: the storage
   * version when it is served, otherwise the served version with the highest
   * Kubernetes version priority. When no version is served, there is nothing to
   * read through, and the storage version is returned so that its schema and
   * printer columns still describe the resources.
   */
  getPreferredVersion(): CustomResourceDefinitionVersion {
    const { apiVersion } = this;

    switch (apiVersion) {
      case "apiextensions.k8s.io/v1": {
        const versions = this.spec.versions ?? [];
        const storageVersion = versions.find((version) => version.storage);

        if (storageVersion?.served) {
          return storageVersion;
        }

        const [servedVersion] = this.getServedVersions();
        const preferredVersion = servedVersion ?? storageVersion;

        if (preferredVersion) {
          return preferredVersion;
        }

        break;
      }

      case "apiextensions.k8s.io/v1beta1": {
        const { additionalPrinterColumns: apc } = this.spec;
        const additionalPrinterColumns = apc?.map(({ JSONPath, ...apc }) => ({ ...apc, jsonPath: JSONPath }));

        return {
          name: this.spec.version!,
          served: true,
          storage: true,
          schema: this.spec.validation,
          additionalPrinterColumns,
        };
      }
    }

    throw new Error(
      `Unknown apiVersion=${apiVersion}: Failed to find a version for CustomResourceDefinition ${this.metadata.name}`,
    );
  }

  /**
   * @deprecated Switch to using {@link getPreferredVersion} instead (which fixes the is a typo)
   */
  getPreferedVersion(): CustomResourceDefinitionVersion {
    return this.getPreferredVersion();
  }

  getVersion() {
    return this.getPreferredVersion().name;
  }

  getVersions() {
    return this.spec.versions?.map((version) => version.name);
  }

  /**
   * The versions marked as served, highest Kubernetes version priority first.
   */
  getServedVersions(): CustomResourceDefinitionVersion[] {
    return (this.spec.versions ?? [])
      .filter((version) => version.served)
      .sort((left, right) => compareByKubeVersionPriority(left.name, right.name));
  }

  isNamespaced() {
    return this.getScope() === "Namespaced";
  }

  getStoredVersions() {
    return this.status?.storedVersions.join(", ") ?? "";
  }

  getNames() {
    return this.spec.names;
  }

  getConversion() {
    return JSON.stringify(this.spec.conversion);
  }

  getPrinterColumns(ignorePriority = true): AdditionalPrinterColumnsV1[] {
    const columns = this.getPreferredVersion().additionalPrinterColumns ?? [];

    return columns.filter((column) => column.name.toLowerCase() !== "age" && (ignorePriority || !column.priority));
  }

  getValidation() {
    return JSON.stringify(this.getPreferredVersion().schema, null, 2);
  }

  getConditions() {
    if (!this.status?.conditions) {
      return [];
    }

    return this.status.conditions.map((condition) => {
      const { message, reason, lastTransitionTime, status } = condition;

      return {
        ...condition,
        isReady: status === "True",
        tooltip: `${message || reason} (${lastTransitionTime})`,
      };
    });
  }
}
